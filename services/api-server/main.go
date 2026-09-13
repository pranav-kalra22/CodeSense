package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/Darshan0403/ai-code-review/services/api-server/db"
	"github.com/Darshan0403/ai-code-review/services/api-server/handlers"
	"github.com/Darshan0403/ai-code-review/services/api-server/ws"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

var jwtSecret = []byte(getEnv("JWT_SECRET", "super-secret-vault-key-change-in-prod"))
var adminPassword = getEnv("ADMIN_PASSWORD", "void2026")

type LoginRequest struct {
	Password string `json:"password"`
}

// --- THE GATEKEEPER MIDDLEWARE (WITH ADMIN ROLE CHECK) ---
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "RESTRICTED AREA: Missing Authorization header", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "RESTRICTED AREA: Invalid or Expired Token", http.StatusUnauthorized)
			return
		}

		// Explicitly assert the Admin Role claim
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if isAdmin, exists := claims["admin"]; !exists || isAdmin != true {
				http.Error(w, "FORBIDDEN: Insufficient Privileges", http.StatusForbidden)
				return
			}
		} else {
			http.Error(w, "FORBIDDEN: Invalid Token Claims", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Log configuration context for debugging env loads
	slog.Info("Initializing Vault Security Engine",
		"password_configured", adminPassword != "void2026",
		"secret_configured", string(jwtSecret) != "super-secret-vault-key-change-in-prod",
	)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dbURL := os.Getenv("POSTGRES_DSN")
	if dbURL == "" {
		dbURL = "postgres://admin:supersecretpassword@localhost:5432/codesense?sslmode=disable"
	}

	database, err := db.Connect(ctx, dbURL)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Pool.Close()

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: os.Getenv("REDIS_PASSWORD"),
	})
	defer rdb.Close()

	wsHub := ws.NewHub()
	go wsHub.Run()
	go wsHub.SubscribeToRedis(ctx, rdb)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:3000",
			"https://*.vercel.app",
			"https://*.onrender.com",
		},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))

	r.Get("/ws/live", wsHub.HandleWS)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "ok", "service": "api-server", "secure": true}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "pong"}`))
		})

		r.Post("/auth/login", func(w http.ResponseWriter, r *http.Request) {
			var req LoginRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "Bad Request", http.StatusBadRequest)
				return
			}

			if req.Password != adminPassword {
				slog.Warn("Failed authentication attempt matched against configuration credentials")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"admin": true,
				"exp":   time.Now().Add(time.Hour * 24).Unix(),
			})

			tokenString, err := token.SignedString(jwtSecret)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
		})

		reviewHandler := &handlers.ReviewHandler{DB: database}
		r.Get("/reviews", reviewHandler.ListReviews)
		r.Get("/reviews/{id}", reviewHandler.GetReviewDetail)

		analyticsHandler := &handlers.AnalyticsHandler{DB: database}
		r.Get("/analytics/dashboard", analyticsHandler.GetDashboard)
		r.Get("/analytics/top-issues", analyticsHandler.GetTopIssues)
		r.Get("/analytics/trends", analyticsHandler.GetTrends)

		repoHandler := &handlers.RepoHandler{DB: database}

		// Static Routes First
		r.Get("/repos", repoHandler.ListRepos)
		r.Post("/repos/explain", repoHandler.ExplainCode)
		r.Post("/search-similar", repoHandler.SearchSimilar)

		// Dynamic (Wildcard) Routes Second
		r.Get("/repos/{id}/stats", repoHandler.GetRepoStats)
		r.Get("/repos/{id}/summary", repoHandler.GetRepoSummary)
		r.Get("/repos/{id}/indexed-files", repoHandler.GetIndexedFiles)
		r.Delete("/repos/{id}", repoHandler.DeleteRepo)

		feedbackHandler := &handlers.FeedbackHandler{DB: database}
		r.Post("/feedback", feedbackHandler.SubmitFeedback)
		r.Get("/repos/{owner}/{repo}/feedback-summary", feedbackHandler.GetRepoFeedbackSummary)

		r.Group(func(r chi.Router) {
			r.Use(AuthMiddleware)
			r.Post("/repos", repoHandler.AddRepo)
			r.Put("/repos/{id}/toggle-pause", repoHandler.TogglePause)
		})
	})

	port := ":8083"
	server := &http.Server{Addr: port, Handler: r}

	go func() {
		slog.Info("SECURE PLG API Server starting", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server error", "error", err)
		}
	}()

	<-ctx.Done()
	server.Shutdown(context.Background())
}
