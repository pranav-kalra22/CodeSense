package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Darshan0403/ai-code-review/services/webhook-handler/handler"
	"github.com/Darshan0403/ai-code-review/services/webhook-handler/queue"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. Setup Logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Load .env (Graceful fail if not present)
	if err := godotenv.Load("../../.env"); err != nil {
		slog.Warn("No .env file found. Falling back to system environment variables.")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 2. Connect to PostgreSQL
	slog.Info("Connecting to PostgreSQL...")
	dbURL := os.Getenv("POSTGRES_DSN")
	if dbURL == "" {
		slog.Warn("POSTGRES_DSN environment variable not set! Falling back to localhost.")
		dbURL = "postgres://admin:supersecretpassword@localhost:5432/codesense?sslmode=disable"
	}

	dbPool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		slog.Error("Database ping failed", "error", err)
		os.Exit(1)
	}
	slog.Info("Connected to database successfully!")

	// 3. Connect to Redis
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		slog.Warn("REDIS_ADDR not set! Falling back to localhost:6379")
		redisAddr = "localhost:6379"
	}
	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: os.Getenv("REDIS_PASSWORD"),
	})
	defer rdb.Close()

	// Assign it to your global queue variable
	queue.Rdb = rdb
	slog.Info("Connected to Redis successfully!")

	// 4. Initialize our new Webhook Server with the DB connection
	ws := &handler.WebhookServer{
		DB:    dbPool,
		Redis: rdb,
	}

	// 5. Setup Router
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// --- THE FIX: Only keeping the real routes ---
	r.Get("/health", handler.HealthHandler)
	r.Post("/webhook/github", ws.HandleGitHubWebhook)
	r.Post("/webhook", ws.HandleGitHubWebhook)

	// 6. Start Server Gracefully
	port := ":8080"
	server := &http.Server{Addr: port, Handler: r}

	go func() {
		slog.Info("Webhook Handler starting", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server error", "error", err)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down Webhook Handler...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	server.Shutdown(shutdownCtx)
	slog.Info("Webhook Handler stopped cleanly.")
}
