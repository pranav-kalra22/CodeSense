package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/Darshan0403/ai-code-review/services/review-worker/db"
	localgh "github.com/Darshan0403/ai-code-review/services/review-worker/github"
	"github.com/Darshan0403/ai-code-review/services/review-worker/models"
	"github.com/Darshan0403/ai-code-review/services/review-worker/parser"
	"github.com/google/go-github/v62/github"
	"github.com/redis/go-redis/v9"
)

const QueueName = "review_jobs"

type AIReviewRequest struct {
	FilePath           string `json:"file_path"`
	DiffContent        string `json:"diff_content"`
	PRNumber           int    `json:"pr_number"`
	Repo               string `json:"repo"`
	CustomInstructions string `json:"custom_instructions"`
}

type AIReviewComment struct {
	FilePath    string `json:"file_path"`
	Line        int    `json:"line_number"`
	Severity    string `json:"severity"`
	Category    string `json:"category"`
	Comment     string `json:"comment_text"`
	CodeSnippet string `json:"code_snippet"` // <-- FIX: Added CodeSnippet here
}

type AIReviewResponse struct {
	Comments []AIReviewComment `json:"comments"`
	IsLGTM   bool              `json:"is_lgtm"`
}

func getAIReview(req AIReviewRequest) (*AIReviewResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	aiBaseURL := os.Getenv("CODE_INTEL_URL")
	if aiBaseURL == "" {
		slog.Warn("CODE_INTEL_URL not set, falling back to Docker network name")
		aiBaseURL = "http://code-intelligence:8082"
	}
	aiURL := aiBaseURL + "/api/review"

	var resp *http.Response
	var lastErr error
	maxRetries := 3

	for attempt := 1; attempt <= maxRetries; attempt++ {
		resp, lastErr = http.Post(aiURL, "application/json", bytes.NewBuffer(jsonData))

		if lastErr == nil && resp.StatusCode == http.StatusOK {
			break
		}

		if resp != nil {
			resp.Body.Close()
		}

		slog.Warn("AI Engine request failed. Retrying...",
			"attempt", attempt,
			"status", func() int {
				if resp != nil {
					return resp.StatusCode
				}
				return 0
			}(),
			"error", lastErr)

		if attempt < maxRetries {
			backoffDuration := time.Duration(1<<attempt) * time.Second
			time.Sleep(backoffDuration)
		}
	}

	if lastErr != nil {
		return nil, fmt.Errorf("AI engine failed after n attempts: %w", lastErr)
	}
	if resp == nil || resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI engine consistently returned bad status after %d attempts", maxRetries)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	slog.Info("================ RAW AI RESPONSE ================")
	slog.Info(string(bodyBytes))
	slog.Info("=================================================")

	var result AIReviewResponse
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

func Start(ctx context.Context, rdb *redis.Client, ghClient *localgh.Client, dbConn *db.DB) {
	slog.Info("Worker started. Listening for jobs...")

	for {
		select {
		case <-ctx.Done():
			slog.Info("Worker shutting down safely...")
			return
		default:
			result, err := rdb.BRPop(ctx, 2*time.Second, QueueName).Result()

			if err == redis.Nil {
				continue
			} else if err != nil {
				if ctx.Err() == nil {
					slog.Error("Redis error", "error", err)
				}
				continue
			}

			var job models.ReviewJob
			if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
				slog.Error("Failed to parse job JSON", "error", err)
				continue
			}

			slog.Info("Picked up new job!", "repo", job.Repo, "pr", job.PRNum, "action", job.Action)

			parts := strings.Split(job.Repo, "/")
			if len(parts) != 2 {
				slog.Error("Invalid repo format inside job", "repo", job.Repo)
				continue
			}
			owner := parts[0]
			repoName := parts[1]

			var diff string
			var diffErr error

			if job.Action == "synchronize" && job.Before != "" && job.After != "" {
				slog.Info("Fetching INCREMENTAL diff for push", "before", job.Before, "after", job.After)
				diff, diffErr = ghClient.FetchCommitDiff(ctx, owner, repoName, job.Before, job.After)
			} else {
				slog.Info("Fetching FULL diff for new PR", "pr", job.PRNum)
				diff, diffErr = ghClient.FetchPRDiff(ctx, owner, repoName, job.PRNum)
			}

			if diffErr != nil {
				slog.Error("Failed to fetch diff", "error", diffErr)
				continue
			}

			parsedFiles, err := parser.ParseRawDiff(diff)
			if err != nil {
				slog.Error("Failed to parse diff", "error", err)
				continue
			}

			// --- NEW: Large PR Throttle (Max 15 files) ---
			const maxFilesToReview = 15
			if len(parsedFiles) > maxFilesToReview {
				slog.Warn("PR exceeds file limit. Truncating.",
					"repo", job.Repo,
					"total_files", len(parsedFiles),
					"reviewed", maxFilesToReview)
				parsedFiles = parsedFiles[:maxFilesToReview]
			}
			// ----------------------------------------------

			var allGitHubComments []*github.DraftReviewComment
			var allAIComments []AIReviewComment

			for _, file := range parsedFiles {
				if len(file.AddedLines) == 0 {
					continue
				}

				validLines := make(map[int]bool)

				var diffBuilder strings.Builder
				for _, line := range file.AddedLines {
					validLines[line.Number] = true
					diffBuilder.WriteString(fmt.Sprintf("%d: + %s\n", line.Number, line.Content))
				}

				diffStr := diffBuilder.String()

				slog.Info("Asking AI to review file...", "file", file.FileName)

				aiResponse, err := getAIReview(AIReviewRequest{
					FilePath:           file.FileName,
					DiffContent:        diffStr,
					PRNumber:           job.PRNum,
					Repo:               job.Repo,
					CustomInstructions: job.CustomInstructions,
				})

				if err != nil {
					slog.Error("Failed to get AI review", "error", err)
					continue
				}

				if aiResponse.IsLGTM {
					slog.Info("AI says LGTM!", "file", file.FileName)
					continue
				}

				for _, aiComment := range aiResponse.Comments {
					if aiComment.FilePath != file.FileName {
						slog.Warn("AI hallucinated file path. Overriding.",
							"bad_path", aiComment.FilePath,
							"good_path", file.FileName)
						aiComment.FilePath = file.FileName
					}

					// 1. Line Number Hallucination Fix
					if !validLines[aiComment.Line] {
						slog.Warn("AI hallucinated an invalid line number. Snapping to fallback.",
							"bad_line", aiComment.Line,
							"snapped_line", file.AddedLines[0].Number)
						aiComment.Line = file.AddedLines[0].Number
					}

					// 2. Diff Display Fix: Extract the contextual code snippet
					aiComment.CodeSnippet = extractSnippet(diffStr, aiComment.Line, 2)

					emoji := ""
					if aiComment.Severity == "error" {
						emoji = ""
					} else if aiComment.Severity == "warning" {
						emoji = ""
					}

					formattedBody := fmt.Sprintf("%s **[%s]** %s", emoji, strings.ToUpper(aiComment.Severity), aiComment.Comment)
					allGitHubComments = append(allGitHubComments, localgh.NewComment(aiComment.FilePath, aiComment.Line, formattedBody))
					allAIComments = append(allAIComments, aiComment)
				}
			}

			if len(allGitHubComments) > 0 {
				slog.Info("Posting AI review to GitHub...")
				err = ghClient.PostReviewComments(ctx, owner, repoName, job.PRNum, allGitHubComments)
				if err != nil {
					slog.Error("Failed to post review", "error", err)
					continue
				}
				slog.Info("Review posted successfully! Go check GitHub! ")

				dbID, err := dbConn.SaveReview(ctx, job.Repo, job.PRNum, "unknown_sha")
				if err != nil {
					slog.Error("Failed to save review to database", "error", err)
				} else {
					slog.Info("Successfully saved review to Postgres!", "db_id", dbID)

					for _, comment := range allAIComments {
						// FIX: Now passing the populated CodeSnippet to the database
						err := dbConn.SaveComment(ctx, dbID, comment.FilePath, comment.Line, comment.Severity, comment.Category, comment.Comment, comment.CodeSnippet)
						if err != nil {
							slog.Error("Failed to save comment to DB", "error", err)
						}
					}
					slog.Info("Successfully saved all comments to Postgres!")

					wsMessage := map[string]interface{}{
						"type":           "REVIEW_COMPLETED",
						"repo":           job.Repo,
						"pr_number":      job.PRNum,
						"status":         "success",
						"comments_count": len(allAIComments),
						"timestamp":      time.Now().Format(time.RFC3339),
					}
					wsBytes, _ := json.Marshal(wsMessage)

					rdb.Publish(ctx, "review:progress", wsBytes)
					slog.Info("Broadcasted success to WebSockets!")
				}

			} else {
				slog.Info("AI had no comments (LGTM!). Nothing posted to GitHub.")
			}

			slog.Info("Finished processing job!", "pr", job.PRNum)
		}
	}
}

// extractSnippet pulls the target line and surrounding context safely
// It has been upgraded to explicitly search for the "LineNumber: +" prefix
// so it doesn't crash on array bounds issues.
func extractSnippet(diffContent string, targetLine int, contextLines int) string {
	lines := strings.Split(diffContent, "\n")
	if len(lines) == 0 {
		return ""
	}

	targetIndex := -1
	targetPrefix := fmt.Sprintf("%d: +", targetLine)

	for i, line := range lines {
		if strings.HasPrefix(line, targetPrefix) {
			targetIndex = i
			break
		}
	}

	// If the AI somehow requested a line that doesn't strictly match the prefix,
	// just return the raw diff content as a graceful fallback.
	if targetIndex == -1 {
		return diffContent
	}

	start := targetIndex - contextLines
	if start < 0 {
		start = 0
	}

	end := targetIndex + contextLines + 1
	if end > len(lines) {
		end = len(lines)
	}

	// Clean up the snippet to remove the "14: + " prefix for cleaner UI rendering
	var cleanSnippet []string
	for _, rawLine := range lines[start:end] {
		// Strip the "Number: + " part
		parts := strings.SplitN(rawLine, ": + ", 2)
		if len(parts) == 2 {
			cleanSnippet = append(cleanSnippet, parts[1])
		} else {
			cleanSnippet = append(cleanSnippet, rawLine)
		}
	}

	return strings.Join(cleanSnippet, "\n")
}
