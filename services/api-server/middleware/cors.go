package middleware

import "net/http"

// CORS is a middleware function that adds Cross-Origin Resource Sharing headers
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from your React frontend (Port 3000)
		// Note: Using "*" is fine for dev, but in production, you'd restrict this to your actual domain
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization")

		// Browsers send a pre-flight "OPTIONS" request before sending POST/PUT requests.
		// We must respond with a 200 OK immediately for these.
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Move on to the actual route handler
		next.ServeHTTP(w, r)
	})
}
