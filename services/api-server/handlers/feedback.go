package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/Darshan0403/ai-code-review/services/api-server/db"
	"github.com/go-chi/chi/v5"
)

type FeedbackHandler struct {
	DB *db.DB
}

type FeedbackRequest struct {
	CommentID    string `json:"comment_id"`
	FeedbackType string `json:"feedback_type"` // 'accepted' or 'rejected'
}

// SubmitFeedback handles the button click from the React UI
// SubmitFeedback handles the button click from the React UI
func (h *FeedbackHandler) SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	var req FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.FeedbackType != "accepted" && req.FeedbackType != "rejected" {
		http.Error(w, "Invalid feedback type", http.StatusBadRequest)
		return
	}

	// 1. Save the feedback
	err := h.DB.SaveFeedback(r.Context(), req.CommentID, req.FeedbackType)
	if err != nil {
		http.Error(w, "Failed to save feedback", http.StatusInternalServerError)
		return
	}

	// 2. PRODUCT UPGRADE: Check if this feedback completes the review
	// If total_comments == total_feedback, the DB will auto-flip it to 'reviewed'
	go func(cID string) {
		err := h.DB.CheckAndMarkReviewAsReviewed(context.Background(), cID)
		if err != nil {
			slog.Warn("Failed to check/update review completion status", "comment_id", cID, "error", err)
		}
	}(req.CommentID)

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"status":"success"}`))
}

// GetRepoFeedbackSummary is called by the Python AI before generating a review
func (h *FeedbackHandler) GetRepoFeedbackSummary(w http.ResponseWriter, r *http.Request) {
	// Chi allows us to use an asterisk wildcard in the route to catch the full repo name
	// e.g., /api/v1/repos/Darshan0403/ai-code-review-test-may20/feedback-summary
	owner := chi.URLParam(r, "owner")
	repo := chi.URLParam(r, "repo")
	repoFullName := owner + "/" + repo

	summary, err := h.DB.GetFeedbackSummary(r.Context(), repoFullName)
	if err != nil {
		http.Error(w, "Failed to get summary", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}
