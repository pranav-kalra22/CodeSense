package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type DB struct {
	Conn *pgx.Conn
}

// NewDB connects to the Postgres container
func NewDB(ctx context.Context, connStr string) (*DB, error) {
	conn, err := pgx.Connect(ctx, connStr)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	return &DB{Conn: conn}, nil
}

// SaveReview logs the PR into the pull_request_reviews table
func (db *DB) SaveReview(ctx context.Context, repo string, prNum int, headSha string) (string, error) {
	var reviewID string

	// We use RETURNING id so we know the UUID of the row we just created
	query := `
		INSERT INTO pull_request_reviews (repo_full_name, pr_number, head_sha, status)
		VALUES ($1, $2, $3, 'COMPLETED')
		RETURNING id
	`
	err := db.Conn.QueryRow(ctx, query, repo, prNum, headSha).Scan(&reviewID)
	if err != nil {
		return "", err
	}

	return reviewID, nil
}

// SaveComment logs an individual AI comment into the review_comments table
// SaveComment logs an individual AI comment into the review_comments table
// SaveComment logs an individual AI comment into the review_comments table
func (db *DB) SaveComment(ctx context.Context, reviewID string, filePath string, lineNumber int, severity string, category string, commentText string, codeSnippet string) error {
	query := `
        INSERT INTO review_comments (review_id, file_path, line_number, severity, category, comment_text, code_snippet)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
	// Ensure all 7 parameters are passed
	_, err := db.Conn.Exec(ctx, query, reviewID, filePath, lineNumber, severity, category, commentText, codeSnippet)
	if err != nil {
		return fmt.Errorf("failed to insert comment: %w", err)
	}
	return nil
}

// SaveFeedback logs user interactions (accept/reject/modify) with AI comments
func (db *DB) SaveFeedback(ctx context.Context, commentID string, feedbackType string) error {
	query := `
        INSERT INTO review_feedback (review_comment_id, feedback_type)
        VALUES ($1, $2)
    `
	_, err := db.Conn.Exec(ctx, query, commentID, feedbackType)
	if err != nil {
		return fmt.Errorf("failed to insert feedback: %w", err)
	}
	return nil
}
