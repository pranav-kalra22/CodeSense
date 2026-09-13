package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"

	"github.com/Darshan0403/ai-code-review/services/api-server/db"
	"github.com/go-chi/chi/v5"
)

type RepoHandler struct {
	DB *db.DB
}

type CreateRepoRequest struct {
	GitHubFullName     string `json:"github_full_name"`
	WebhookSecret      string `json:"webhook_secret"`
	CustomInstructions string `json:"custom_instructions"` // <-- Added to struct
}

type DeleteRepoRequest struct {
	Passphrase string `json:"passphrase"`
}

// ListRepos handles GET /api/v1/repos
func (h *RepoHandler) ListRepos(w http.ResponseWriter, r *http.Request) {
	repos, err := h.DB.ListRepos(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch repositories", http.StatusInternalServerError)
		return
	}

	if repos == nil {
		repos = []db.RepoSummary{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(repos)
}

// AddRepo handles POST /api/v1/repos
func (h *RepoHandler) AddRepo(w http.ResponseWriter, r *http.Request) {
	var req CreateRepoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.GitHubFullName == "" {
		http.Error(w, "github_full_name is required", http.StatusBadRequest)
		return
	}

	id, err := h.DB.AddRepo(r.Context(), req.GitHubFullName, req.WebhookSecret, req.CustomInstructions)
	if err != nil {
		http.Error(w, "Failed to create repository", http.StatusInternalServerError)
		return
	}

	// --- NEW: TRIGGER REAL BACKGROUND INDEXING PIPELINE ---
	go func(repoName string) {
		aiURL := os.Getenv("CODE_INTEL_URL")
		if aiURL == "" {
			aiURL = "http://code-intelligence:8082"
		}

		reqBody, _ := json.Marshal(map[string]string{
			"repo_name": repoName,
		})

		// Fire and forget POST request to Python
		resp, err := http.Post(aiURL+"/api/index", "application/json", bytes.NewBuffer(reqBody))
		if err != nil {
			fmt.Printf(" Failed to trigger indexing for %s: %v\n", repoName, err)
			return
		}
		defer resp.Body.Close()

		fmt.Printf(" Successfully triggered background indexing for %s\n", repoName)
	}(req.GitHubFullName)
	// ------------------------------------------------------

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Repository registered successfully",
		"id":      id,
	})
}

// GetRepoStats handles GET /api/v1/repos/{id}/stats
func (h *RepoHandler) GetRepoStats(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "id")

	stats, err := h.DB.GetRepoStats(r.Context(), repoID)
	if err != nil {
		http.Error(w, "Repository not found or database error", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// TogglePause handles PUT /api/v1/repos/{id}/toggle-pause
func (h *RepoHandler) TogglePause(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "id")

	newState, err := h.DB.ToggleRepoPause(r.Context(), repoID)
	if err != nil {
		http.Error(w, "Failed to toggle repository status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"is_paused": newState})
}

// GetRepoSummary acts as a bridge to the Python Code Intelligence service
func (h *RepoHandler) GetRepoSummary(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "id")

	var repoFullName string
	err := h.DB.Pool.QueryRow(r.Context(), "SELECT github_full_name FROM repositories WHERE id = $1", repoID).Scan(&repoFullName)
	if err != nil {
		http.Error(w, "Repository not found", http.StatusNotFound)
		return
	}

	aiURL := os.Getenv("CODE_INTEL_URL")
	if aiURL == "" {
		aiURL = "http://code-intelligence:8082"
	}

	reqBody, _ := json.Marshal(map[string]string{
		"repo_name": repoFullName,
	})

	resp, err := http.Post(aiURL+"/api/repo-summary", "application/json", bytes.NewBuffer(reqBody))
	if err != nil || resp.StatusCode != 200 {
		http.Error(w, "Failed to generate summary from AI engine", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

// ExplainCode acts as a bridge to the Python Code Intelligence service
func (h *RepoHandler) ExplainCode(w http.ResponseWriter, r *http.Request) {
	var reqBody map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	aiURL := os.Getenv("CODE_INTEL_URL")
	if aiURL == "" {
		aiURL = "http://code-intelligence:8082"
	}

	proxyReq, _ := json.Marshal(reqBody)
	resp, err := http.Post(aiURL+"/api/explain", "application/json", bytes.NewBuffer(proxyReq))
	if err != nil || resp.StatusCode != 200 {
		http.Error(w, "Failed to get explanation from AI engine", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

// --- NEW: Explorer Bridge Endpoints ---

type SearchSimilarRequest struct {
	RepoID string `json:"repo_id"`
	Query  string `json:"query"`
}

// GetIndexedFiles asks Python for the AST tree of a repository
func (h *RepoHandler) GetIndexedFiles(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "id")

	// 1. Look up the full repo name using the ID
	var repoFullName string
	err := h.DB.Pool.QueryRow(r.Context(), "SELECT github_full_name FROM repositories WHERE id = $1", repoID).Scan(&repoFullName)
	if err != nil {
		http.Error(w, "Repository not found", http.StatusNotFound)
		return
	}

	// 2. Call the Python AI Engine
	aiURL := os.Getenv("CODE_INTEL_URL")
	if aiURL == "" {
		aiURL = "http://code-intelligence:8082"
	}

	reqBody, _ := json.Marshal(map[string]string{
		"repo_name": repoFullName,
	})

	resp, err := http.Post(aiURL+"/api/ast", "application/json", bytes.NewBuffer(reqBody))
	if err != nil || resp.StatusCode != 200 {
		http.Error(w, "Failed to fetch AST from AI engine", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// 3. Pipe the JSON directly to React
	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

// SearchSimilar asks Python to query ChromaDB for nearest neighbors
func (h *RepoHandler) SearchSimilar(w http.ResponseWriter, r *http.Request) {
	var req SearchSimilarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	// 1. Look up the full repo name
	var repoFullName string
	err := h.DB.Pool.QueryRow(r.Context(), "SELECT github_full_name FROM repositories WHERE id = $1", req.RepoID).Scan(&repoFullName)
	if err != nil {
		http.Error(w, "Repository not found", http.StatusNotFound)
		return
	}

	// 2. Call the Python AI Engine
	aiURL := os.Getenv("CODE_INTEL_URL")
	if aiURL == "" {
		aiURL = "http://code-intelligence:8082"
	}

	// Forward both the repo name and the target query
	proxyReq, _ := json.Marshal(map[string]string{
		"repo_name": repoFullName,
		"query":     req.Query,
	})

	resp, err := http.Post(aiURL+"/api/search", "application/json", bytes.NewBuffer(proxyReq))
	if err != nil || resp.StatusCode != 200 {
		http.Error(w, "Failed to search ChromaDB", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// 3. Pipe the JSON directly to React
	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

// DeleteRepo handles DELETE /api/v1/repos/{id}
func (h *RepoHandler) DeleteRepo(w http.ResponseWriter, r *http.Request) {
	repoID := chi.URLParam(r, "id")

	var req DeleteRepoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check against your server's environment variable, with a fallback
	expectedPassphrase := os.Getenv("ADMIN_PASSPHRASE")
	if expectedPassphrase == "" {
		expectedPassphrase = "VOID_ADMIN_2026" // Fallback so you aren't locked out in dev
	}

	if req.Passphrase != expectedPassphrase {
		slog.Warn("Failed repository purge attempt: Invalid passphrase", "repo_id", repoID)
		http.Error(w, "Forbidden: Incorrect passphrase", http.StatusForbidden)
		return
	}

	err := h.DB.DeleteRepo(r.Context(), repoID)
	if err != nil {
		slog.Error("Database error during repository purge", "repo_id", repoID, "error", err)
		http.Error(w, "System Error: Failed to purge repository", http.StatusInternalServerError)
		return
	}

	slog.Info("Successfully purged repository and all associated data", "repo_id", repoID)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"success", "message":"Repository purged"}`))
}
