package auth

import (
	"sync"
	"time"
)

type failedAttemptRecord struct {
	Count       int
	LastAttempt time.Time
}

// LoginRateLimiter enforces brute-force protection on authentication attempts.
type LoginRateLimiter struct {
	mu          sync.Mutex
	attempts    map[string]*failedAttemptRecord
	maxAttempts int
	window      time.Duration
}

// NewLoginRateLimiter creates a limiter with configurable max attempts and lockout window.
func NewLoginRateLimiter(maxAttempts int, window time.Duration) *LoginRateLimiter {
	return &LoginRateLimiter{
		attempts:    make(map[string]*failedAttemptRecord),
		maxAttempts: maxAttempts,
		window:      window,
	}
}

// IsBlocked checks if the identifier (IP or email) is currently locked out.
func (l *LoginRateLimiter) IsBlocked(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	rec, exists := l.attempts[key]
	if !exists {
		return false
	}

	// If lockout window expired, reset
	if time.Since(rec.LastAttempt) > l.window {
		delete(l.attempts, key)
		return false
	}

	return rec.Count >= l.maxAttempts
}

// RecordFailure records a failed login attempt. Returns true if key is now blocked.
func (l *LoginRateLimiter) RecordFailure(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	rec, exists := l.attempts[key]
	if !exists || time.Since(rec.LastAttempt) > l.window {
		l.attempts[key] = &failedAttemptRecord{
			Count:       1,
			LastAttempt: time.Now(),
		}
		return 1 >= l.maxAttempts
	}

	rec.Count++
	rec.LastAttempt = time.Now()
	return rec.Count >= l.maxAttempts
}

// RecordSuccess clears failed login records upon legitimate login.
func (l *LoginRateLimiter) RecordSuccess(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}
