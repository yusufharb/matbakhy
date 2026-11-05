package auth_test

import (
	"testing"
	"time"

	"github.com/marketplace/core/internal/modules/auth"
)

func BenchmarkGenerateAndValidateJWT(b *testing.B) {
	_ = auth.SetJWTSecret("benchmark-jwt-secret-key-at-least-32-chars-long")

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		token, err := auth.GenerateJWT("user-bench-1", "user@nexus.market", "org-bench-1", "merchant")
		if err != nil {
			b.Fatalf("failed to generate token: %v", err)
		}
		claims, err := auth.ValidateJWT(token)
		if err != nil || claims.UserID != "user-bench-1" {
			b.Fatalf("failed to validate token: %v", err)
		}
	}
}

func BenchmarkLoginRateLimiterConcurrent(b *testing.B) {
	limiter := auth.NewLoginRateLimiter(1000, 1*time.Minute)

	b.ResetTimer()
	b.ReportAllocs()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_ = limiter.IsBlocked("192.168.1.100")
		}
	})
}
