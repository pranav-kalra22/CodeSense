package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"log/slog"

	"github.com/Darshan0403/ai-code-review/services/webhook-handler/queue" // Adjust this to your actual module path
)

type HealthResponse struct {
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
	QueueLength int64  `json:"queue_length"`
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	// Ask Redis how many jobs are in the queue
	length, err := queue.GetQueueLength(r.Context())
	if err != nil {
		slog.Warn("Could not fetch queue length for health check", "error", err)
		length = -1 // Indicate an error state for the queue
	}

	response := HealthResponse{
		Status:      "ok",
		Timestamp:   time.Now().Format(time.RFC3339), // Standard time format
		QueueLength: length,
	}

	// Tell the client to expect JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(response)
}
