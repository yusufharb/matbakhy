package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

type AuthSessionRecord struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	TokenHash string    `json:"token_hash"`
	ExpiresAt time.Time `json:"expires_at"`
	Revoked   bool      `json:"revoked"`
	CreatedAt time.Time `json:"created_at"`
}

// GenerateRefreshToken generates a cryptographically secure 256-bit random hex string
// and returns both the plain token and its SHA-256 hash.
func GenerateRefreshToken() (string, string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	plainToken := hex.EncodeToString(bytes)
	hash := HashToken(plainToken)
	return plainToken, hash, nil
}

// HashToken computes the SHA-256 hex digest of a token string.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// CreateSession stores a new refresh token session in iam.auth_sessions
func (r *Repository) CreateSession(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	query := `
		INSERT INTO iam.auth_sessions (user_id, token_hash, expires_at, revoked)
		VALUES ($1, $2, $3, FALSE)
	`
	_, err := r.pool.Exec(ctx, query, userID, tokenHash, expiresAt)
	return err
}

// GetSessionByTokenHash retrieves an active session by token hash
func (r *Repository) GetSessionByTokenHash(ctx context.Context, tokenHash string) (*AuthSessionRecord, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, revoked, created_at
		FROM iam.auth_sessions
		WHERE token_hash = $1
	`
	var s AuthSessionRecord
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&s.ID, &s.UserID, &s.TokenHash, &s.ExpiresAt, &s.Revoked, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// RotateSession revokes the old refresh token and creates a new one in an atomic transaction
func (r *Repository) RotateSession(ctx context.Context, oldSessionID, userID, newTokenHash string, expiresAt time.Time) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Revoke old session
	_, err = tx.Exec(ctx, `UPDATE iam.auth_sessions SET revoked = TRUE WHERE id = $1`, oldSessionID)
	if err != nil {
		return fmt.Errorf("failed to revoke old session: %w", err)
	}

	// Insert new session
	_, err = tx.Exec(ctx, `
		INSERT INTO iam.auth_sessions (user_id, token_hash, expires_at, revoked)
		VALUES ($1, $2, $3, FALSE)
	`, userID, newTokenHash, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to create rotated session: %w", err)
	}

	return tx.Commit(ctx)
}
