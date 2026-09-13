package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

// Connect establishes a connection pool to PostgreSQL
func Connect(ctx context.Context, connStr string) (*DB, error) {
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	// Test the connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	return &DB{Pool: pool}, nil
}

// --- Data Models ---
type Review struct {
	ID             string    `json:"id"`
	RepoFullName   string    `json:"repo_full_name"`
	PRNumber       int       `json:"pr_number"`
	CreatedAt      time.Time `json:"created_at"`
	TotalComments  int       `json:"total_comments"`
	ErrorCount     int       `json:"error_count"`
	WarningCount   int       `json:"warning_count"`
	UserReadStatus string    `json:"user_read_status"`
}

type Comment struct {
	ID           string    `json:"id"`
	ReviewID     string    `json:"review_id"`
	FilePath     string    `json:"file_path"`
	LineNumber   int       `json:"line_number"`
	Severity     string    `json:"severity"`
	Category     string    `json:"category"`
	CommentText  string    `json:"comment_text"`
	CodeSnippet  string    `json:"code_snippet"`
	CreatedAt    time.Time `json:"created_at"`
	FeedbackType *string   `json:"feedback_type"`
}

type DashboardStats struct {
	TotalRepos           int     `json:"total_repos"`
	TotalReviews         int     `json:"total_reviews"`
	TotalComments        int     `json:"total_comments"`
	AvgCommentsPerReview float64 `json:"avg_comments_per_review"`
	ErrorCount           int     `json:"error_count"`
	WarningCount         int     `json:"warning_count"`
	InfoCount            int     `json:"info_count"`
	AcceptanceRate       float64 `json:"acceptance_rate"`
}

// --- Fetch Methods ---
// GetReviews fetches a paginated list of PR reviews
func (db *DB) GetReviews(ctx context.Context, limit, offset int) ([]Review, error) {
	query := `
        SELECT 
            pr.id, pr.repo_full_name, pr.pr_number, pr.created_at, pr.user_read_status,
            COUNT(c.id) AS total_comments,
            SUM(CASE WHEN c.severity = 'error' THEN 1 ELSE 0 END) AS error_count,
            SUM(CASE WHEN c.severity = 'warning' THEN 1 ELSE 0 END) AS warning_count
        FROM pull_request_reviews pr
        LEFT JOIN review_comments c ON CAST(c.review_id AS VARCHAR) = CAST(pr.id AS VARCHAR)
        GROUP BY pr.id, pr.repo_full_name, pr.pr_number, pr.created_at, pr.user_read_status
        ORDER BY pr.created_at DESC 
        LIMIT $1 OFFSET $2
    `

	rows, err := db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var r Review
		// MUST perfectly match the 8 columns selected above
		if err := rows.Scan(
			&r.ID, &r.RepoFullName, &r.PRNumber, &r.CreatedAt, &r.UserReadStatus,
			&r.TotalComments, &r.ErrorCount, &r.WarningCount,
		); err != nil {
			return nil, err
		}
		reviews = append(reviews, r)
	}
	return reviews, nil
}

// GetReviewWithComments fetches a single review and all of its AI comments
func (db *DB) GetReviewWithComments(ctx context.Context, reviewID string) (*Review, []Comment, error) {
	// 1. Get the Review
	var r Review
	reviewQuery := `SELECT id, repo_full_name, pr_number, created_at, user_read_status FROM pull_request_reviews WHERE id = $1`
	err := db.Pool.QueryRow(ctx, reviewQuery, reviewID).Scan(&r.ID, &r.RepoFullName, &r.PRNumber, &r.CreatedAt, &r.UserReadStatus)
	if err != nil {
		return nil, nil, err
	}

	// 2. Get the Comments
	commentsQuery := `
        SELECT rc.id, rc.review_id, rc.file_path, rc.line_number, rc.severity, rc.category, rc.comment_text, rc.code_snippet, rc.created_at, rf.feedback_type
        FROM review_comments rc
        LEFT JOIN review_feedback rf ON rc.id = rf.review_comment_id
        WHERE rc.review_id = $1
        ORDER BY rc.file_path, rc.line_number
    `

	rows, err := db.Pool.Query(ctx, commentsQuery, reviewID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		// Ensure 10 variables map to the 10 SELECT columns perfectly
		if err := rows.Scan(&c.ID, &c.ReviewID, &c.FilePath, &c.LineNumber, &c.Severity, &c.Category, &c.CommentText, &c.CodeSnippet, &c.CreatedAt, &c.FeedbackType); err != nil {
			continue
		}
		comments = append(comments, c)
	}

	return &r, comments, nil
}
func (db *DB) GetDashboardStats(ctx context.Context) (*DashboardStats, error) {
	var stats DashboardStats

	// We bundle all 6 counts into a single SQL execution for maximum performance.
	// We retain your CAST(... AS INT) logic to prevent Postgres bigint scanning panics.
	query := `
        SELECT 
            (SELECT COUNT(DISTINCT repo_full_name) FROM pull_request_reviews) as total_repos,
            (SELECT COUNT(*) FROM pull_request_reviews) as total_reviews,
            (SELECT COUNT(*) FROM review_comments) as total_comments,
            
            (SELECT COALESCE(AVG(comment_count), 0) FROM (
                SELECT COUNT(*) as comment_count 
                FROM review_comments 
                GROUP BY review_id
            ) subq) as avg_comments,
            
            (SELECT COUNT(*) FROM review_comments WHERE severity = 'error') as error_count,
            (SELECT COUNT(*) FROM review_comments WHERE severity = 'warning') as warning_count,
            (SELECT COUNT(*) FROM review_comments WHERE severity = 'info') as info_count,

            (SELECT COALESCE(
                (SUM(CASE WHEN feedback_type = 'accepted' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100, 
            0) FROM review_feedback) as acceptance_rate
    `

	err := db.Pool.QueryRow(ctx, query).Scan(
		&stats.TotalRepos,
		&stats.TotalReviews,
		&stats.TotalComments,
		&stats.AvgCommentsPerReview,
		&stats.ErrorCount,
		&stats.WarningCount,
		&stats.InfoCount,
		&stats.AcceptanceRate,
	)

	if err != nil {
		return nil, err
	}

	// Calculate Average safely in Go to prevent SQL division-by-zero crashes
	if stats.TotalReviews > 0 {
		stats.AvgCommentsPerReview = float64(stats.TotalComments) / float64(stats.TotalReviews)
	}

	return &stats, nil
}

// --- Repository Models & Methods ---

type RepoSummary struct {
	ID             string     `json:"id"`
	GitHubFullName string     `json:"github_full_name"`
	TotalReviews   int        `json:"total_reviews"`
	LastReviewAt   *time.Time `json:"last_review_at"`
	IsPaused       bool       `json:"is_paused"`
}

// ListRepos fetches all monitored repos with their review stats
func (db *DB) ListRepos(ctx context.Context) ([]RepoSummary, error) {
	query := `
        SELECT r.id, r.github_full_name, r.is_paused, COUNT(pr.id) as total_reviews, MAX(pr.created_at) as last_review_at
        FROM repositories r
        LEFT JOIN pull_request_reviews pr ON r.github_full_name = pr.repo_full_name
        GROUP BY r.id, r.github_full_name, r.is_paused
        ORDER BY r.github_full_name ASC
    `
	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var repos []RepoSummary
	for rows.Next() {
		var r RepoSummary
		if err := rows.Scan(&r.ID, &r.GitHubFullName, &r.IsPaused, &r.TotalReviews, &r.LastReviewAt); err != nil {
			return nil, err
		}
		repos = append(repos, r)
	}
	return repos, nil
}

// AddRepo registers a new repository into the system
func (db *DB) AddRepo(ctx context.Context, fullName, secret, customInstructions string) (string, error) {
	var id string
	query := `
        INSERT INTO repositories (github_full_name, webhook_secret, custom_instructions) 
        VALUES ($1, $2, $3) 
        RETURNING id
    `
	err := db.Pool.QueryRow(ctx, query, fullName, secret, customInstructions).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

func (db *DB) ToggleRepoPause(ctx context.Context, repoID string) (bool, error) {
	var newState bool
	query := `UPDATE repositories SET is_paused = NOT is_paused WHERE id = $1 RETURNING is_paused`
	err := db.Pool.QueryRow(ctx, query, repoID).Scan(&newState)
	return newState, err
}

type RepoDetailStats struct {
	ID             string     `json:"id"`
	GitHubFullName string     `json:"github_full_name"`
	TotalReviews   int        `json:"total_reviews"`
	TotalComments  int        `json:"total_comments"`
	LastReviewAt   *time.Time `json:"last_review_at"`
}

// GetRepoStats fetches deep metrics for a single repository
func (db *DB) GetRepoStats(ctx context.Context, repoID string) (*RepoDetailStats, error) {
	query := `
		SELECT 
			r.id, 
			r.github_full_name, 
			COUNT(DISTINCT pr.id) as total_reviews, 
			COUNT(c.id) as total_comments, 
			MAX(pr.created_at) as last_review_at
		FROM repositories r
		LEFT JOIN pull_request_reviews pr ON r.github_full_name = pr.repo_full_name
		LEFT JOIN review_comments c ON pr.id = CAST(c.review_id AS UUID)
		WHERE r.id = $1
		GROUP BY r.id, r.github_full_name
	`

	var stats RepoDetailStats
	err := db.Pool.QueryRow(ctx, query, repoID).Scan(
		&stats.ID,
		&stats.GitHubFullName,
		&stats.TotalReviews,
		&stats.TotalComments,
		&stats.LastReviewAt,
	)

	if err != nil {
		return nil, err
	}

	return &stats, nil
}

type CategoryCount struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

// GetTopIssues returns the most frequent AI comment categories
func (db *DB) GetTopIssues(ctx context.Context) ([]CategoryCount, error) {
	query := `
		SELECT category, COUNT(*) as count 
		FROM review_comments 
		WHERE category IS NOT NULL
		GROUP BY category 
		ORDER BY count DESC 
		LIMIT 5
	`
	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []CategoryCount
	for rows.Next() {
		var c CategoryCount
		if err := rows.Scan(&c.Category, &c.Count); err != nil {
			continue
		}
		issues = append(issues, c)
	}
	return issues, nil
}

type TrendPoint struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// GetTrends gets daily review volumes
func (db *DB) GetTrends(ctx context.Context) ([]TrendPoint, error) {
	query := `
		SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
		FROM pull_request_reviews 
		GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') 
		ORDER BY date ASC 
		LIMIT 14
	`
	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trends []TrendPoint
	for rows.Next() {
		var t TrendPoint
		if err := rows.Scan(&t.Date, &t.Count); err != nil {
			continue
		}
		trends = append(trends, t)
	}
	return trends, nil
}

// MarkReviewAsRead updates the status when a user opens the review detail page.
// It ONLY updates it if the current status is 'unread'.
func (db *DB) MarkReviewAsRead(ctx context.Context, reviewID string) error {
	query := `
		UPDATE pull_request_reviews 
		SET user_read_status = 'read' 
		WHERE id = $1 AND user_read_status = 'unread'
	`
	_, err := db.Pool.Exec(ctx, query, reviewID)
	return err
}

// CheckAndMarkReviewAsReviewed acts as our State Machine.
// It counts total comments vs total feedback for a review. If they match, it marks the PR as 'reviewed'.
func (db *DB) CheckAndMarkReviewAsReviewed(ctx context.Context, commentID string) error {
	query := `
		WITH review_info AS (
			SELECT review_id FROM review_comments WHERE id = $1
		),
		comment_stats AS (
			SELECT
				c.review_id,
				COUNT(c.id) as total_comments,
				COUNT(f.id) as total_feedback
			FROM review_comments c
			LEFT JOIN review_feedback f ON c.id = f.review_comment_id
			WHERE c.review_id = (SELECT review_id FROM review_info)
			GROUP BY c.review_id
		)
		UPDATE pull_request_reviews
		SET user_read_status = 'reviewed'
		WHERE id = (SELECT review_id FROM review_info)
		  AND (SELECT total_comments FROM comment_stats) > 0
		  AND (SELECT total_comments FROM comment_stats) = (SELECT total_feedback FROM comment_stats)
		  AND user_read_status != 'reviewed';
	`
	_, err := db.Pool.Exec(ctx, query, commentID)
	return err
}

// DeleteRepo permanently purges a repository and ALL its associated reviews, comments, and feedback.
func (db *DB) DeleteRepo(ctx context.Context, repoID string) error {
	// Start a transaction to ensure a clean, all-or-nothing purge
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	// Defer a rollback in case anything panics or fails before the Commit
	defer tx.Rollback(ctx)

	// 1. Get the repo name (since reviews are mapped by name, not UUID)
	var repoName string
	err = tx.QueryRow(ctx, "SELECT github_full_name FROM repositories WHERE id = $1", repoID).Scan(&repoName)
	if err != nil {
		return err // Repo not found
	}

	// 2. Purge Feedback (tied to comments)
	_, err = tx.Exec(ctx, `
		DELETE FROM review_feedback 
		WHERE review_comment_id IN (
			SELECT id FROM review_comments WHERE review_id IN (
				SELECT id FROM pull_request_reviews WHERE repo_full_name = $1
			)
		)
	`, repoName)
	if err != nil {
		return err
	}

	// 3. Purge Comments (tied to PRs)
	_, err = tx.Exec(ctx, `
		DELETE FROM review_comments 
		WHERE review_id IN (
			SELECT id FROM pull_request_reviews WHERE repo_full_name = $1
		)
	`, repoName)
	if err != nil {
		return err
	}

	// 4. Purge PR Reviews (tied to Repo Name)
	_, err = tx.Exec(ctx, "DELETE FROM pull_request_reviews WHERE repo_full_name = $1", repoName)
	if err != nil {
		return err
	}

	// 5. Finally, Purge the Repository itself
	_, err = tx.Exec(ctx, "DELETE FROM repositories WHERE id = $1", repoID)
	if err != nil {
		return err
	}

	// Commit the transaction to disk
	return tx.Commit(ctx)
}
