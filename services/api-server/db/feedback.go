package db

import (
	"context"
	"fmt"
)

type FeedbackSummary struct {
	AcceptanceRate float64  `json:"acceptance_rate"`
	TotalFeedback  int      `json:"total_feedback"`
	RecentRejected []string `json:"recent_rejected"`
	RecentAccepted []string `json:"recent_accepted"`
}

// SaveFeedback inserts the accept/reject action into the database
func (db *DB) SaveFeedback(ctx context.Context, commentID string, feedbackType string) error {
	query := `
		INSERT INTO review_feedback (review_comment_id, feedback_type)
		VALUES ($1, $2)
	`
	_, err := db.Pool.Exec(ctx, query, commentID, feedbackType)
	if err != nil {
		return fmt.Errorf("failed to insert feedback: %w", err)
	}
	return nil
}

// GetFeedbackSummary pulls the historical context for the AI to learn from
func (db *DB) GetFeedbackSummary(ctx context.Context, repoFullName string) (*FeedbackSummary, error) {
	// Join the tables to get feedback specifically for this repository
	query := `
		SELECT rf.feedback_type, rc.comment_text
		FROM review_feedback rf
		JOIN review_comments rc ON rf.review_comment_id = rc.id
		JOIN pull_request_reviews prr ON rc.review_id = prr.id
		WHERE prr.repo_full_name = $1
		ORDER BY rf.created_at DESC
		LIMIT 40
	`
	rows, err := db.Pool.Query(ctx, query, repoFullName)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feedback: %w", err)
	}
	defer rows.Close()

	summary := &FeedbackSummary{}
	acceptedCount := 0

	for rows.Next() {
		var fType, text string
		if err := rows.Scan(&fType, &text); err != nil {
			continue
		}
		summary.TotalFeedback++

		if fType == "accepted" {
			acceptedCount++
			if len(summary.RecentAccepted) < 10 { // Keep prompt context relatively small
				summary.RecentAccepted = append(summary.RecentAccepted, text)
			}
		} else if fType == "rejected" {
			if len(summary.RecentRejected) < 10 {
				summary.RecentRejected = append(summary.RecentRejected, text)
			}
		}
	}

	if summary.TotalFeedback > 0 {
		summary.AcceptanceRate = float64(acceptedCount) / float64(summary.TotalFeedback) * 100
	}

	return summary, nil
}
