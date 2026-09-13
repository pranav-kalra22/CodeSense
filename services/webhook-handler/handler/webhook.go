package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/Darshan0403/ai-code-review/services/webhook-handler/models"
	"github.com/Darshan0403/ai-code-review/services/webhook-handler/queue"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// WebhookServer holds our database connection AND Redis client
type WebhookServer struct {
	DB    *pgxpool.Pool
	Redis *redis.Client
}

func validateSignature(payload []byte, signature string, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

// HandleGitHubWebhook is now a method on WebhookServer so it can access the DB and Redis
func (ws *WebhookServer) HandleGitHubWebhook(w http.ResponseWriter, r *http.Request) {
	signature := r.Header.Get("X-Hub-Signature-256")
	if signature == "" {
		http.Error(w, "Missing signature", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Processing error", http.StatusInternalServerError)
		return
	}

	// 1. Unmarshal just enough to get the repository name
	var payload models.WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		slog.Error("Failed to parse JSON payload", "error", err)
		http.Error(w, "Bad JSON", http.StatusBadRequest)
		return
	}

	// 2. Query the database for the correct secret
	var dbSecret string
	var customInstructions string
	var isPaused bool

	query := `SELECT webhook_secret, COALESCE(custom_instructions, ''), is_paused FROM repositories WHERE github_full_name = $1`
	err = ws.DB.QueryRow(r.Context(), query, payload.Repository.FullName).Scan(&dbSecret, &customInstructions, &isPaused)
	if err != nil {
		slog.Error("Repository not found in DB or missing secret", "repo", payload.Repository.FullName, "error", err)
		http.Error(w, "Unauthorized: Unknown Repository", http.StatusUnauthorized)
		return
	}
	if isPaused {
		slog.Info("Ignored payload: Repository is globally paused", "repo", payload.Repository.FullName)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Ignored: Repository is paused"))
		return
	}

	// 3. Validate using the REAL secret from the database
	if !validateSignature(body, signature, dbSecret) {
		slog.Warn("Invalid webhook signature", "repo", payload.Repository.FullName)
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// 4. Filter for actions we care about
	if payload.Action != "opened" && payload.Action != "synchronize" {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Ignored action: " + payload.Action))
		return
	}

	// --- FIXED: Structural Safety Shield ---
	// Since PullRequest is a struct (not a pointer), we check if the required fields are empty/zero.
	if payload.PullRequest.Number == 0 || payload.PullRequest.Head.SHA == "" {
		slog.Warn("Ignored payload: Missing PR Number or Head SHA", "repo", payload.Repository.FullName)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Ignored: Malformed PR data"))
		return
	}
	// ---------------------------------------

	// --- Broadcast "review_started" to the Live Matrix ---
	startedEvent := map[string]interface{}{
		"type":      "review_started",
		"repo":      payload.Repository.FullName,
		"pr_number": payload.PullRequest.Number,
		"status":    "processing",
		"message":   "AI intercepted PR. Analyzing semantic diff...",
	}

	if eventBytes, err := json.Marshal(startedEvent); err == nil {
		ws.Redis.Publish(r.Context(), "codesense:live_feed", eventBytes)
	}

	// --- Idempotency Lock ---
	jobKey := "lock:review:" + payload.Repository.FullName + ":" + payload.PullRequest.Head.SHA

	isNewJob, err := ws.Redis.SetNX(r.Context(), jobKey, "processing", 24*time.Hour).Result()
	if err != nil {
		slog.Error("Redis idempotency check failed", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if !isNewJob {
		slog.Warn("Duplicate webhook payload received. Ignoring.", "repo", payload.Repository.FullName, "sha", payload.PullRequest.Head.SHA)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Duplicate PR payload ignored."))
		return
	}

	// 5. Package and Enqueue the job for Redis
	job := models.ReviewJob{
		Repo:               payload.Repository.FullName,
		PRNum:              payload.PullRequest.Number,
		Action:             payload.Action,
		Before:             payload.Before,
		After:              payload.After,
		DiffURL:            payload.PullRequest.DiffURL,
		HeadSHA:            payload.PullRequest.Head.SHA,
		BaseSHA:            payload.PullRequest.Base.SHA,
		CustomInstructions: customInstructions,
	}

	if err := queue.Enqueue(r.Context(), job); err != nil {
		slog.Error("Failed to enqueue job", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	slog.Info("Job enqueued successfully!", "repo", job.Repo, "pr_number", job.PRNum, "action", job.Action)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("PR Accepted and Enqueued!"))
}
