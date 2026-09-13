package queue

import (
	"context"
	"encoding/json"

	"github.com/Darshan0403/ai-code-review/services/webhook-handler/models"

	"github.com/redis/go-redis/v9"
)

var Rdb = redis.NewClient(&redis.Options{Addr: "localhost:6379"})

const QueueName = "review_jobs"

// Enqueue turns the job into JSON and pushes it to Redis
func Enqueue(ctx context.Context, job models.ReviewJob) error {
	bytes, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return Rdb.LPush(ctx, QueueName, bytes).Err()
}

// Dequeue blocks until a job is available, pops it, and turns it back into a struct
func Dequeue(ctx context.Context) (*models.ReviewJob, error) {
	// BRPOP blocks until an item is available. "0" means wait forever.
	// It returns a slice: [queue_name, json_value]
	result, err := Rdb.BRPop(ctx, 0, QueueName).Result()
	if err != nil {
		return nil, err
	}

	var job models.ReviewJob
	// result[1] contains the actual JSON string

	if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
		return nil, err
	}

	return &job, nil
}

// GetQueueLength returns the number of items in the review queue
func GetQueueLength(ctx context.Context) (int64, error) {
	// LLen gets the length of a Redis List
	return Rdb.LLen(ctx, QueueName).Result()
}
