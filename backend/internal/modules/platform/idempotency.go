package platform

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrIdempotencyConflict = errors.New("idempotency key already used with a different request payload")
)

type IdempotencyRecord struct {
	Key          string          `json:"key"`
	Scope        string          `json:"scope"`
	UserID       *string         `json:"user_id,omitempty"`
	RequestHash  string          `json:"request_hash"`
	StatusCode   int             `json:"status_code"`
	ResponseBody json.RawMessage `json:"response_body"`
}

type IdempotencyStore struct {
	pool *pgxpool.Pool
}

func NewIdempotencyStore(pool *pgxpool.Pool) *IdempotencyStore {
	return &IdempotencyStore{pool: pool}
}

func HashPayload(payload []byte) string {
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:])
}

// Get retrieves an existing idempotency record and checks for payload conflict.
// If record exists and hash matches, it returns the record.
// If record exists and hash does NOT match, it returns ErrIdempotencyConflict.
// If record does not exist, it returns pgx.ErrNoRows.
func (s *IdempotencyStore) Get(ctx context.Context, key, requestHash string) (*IdempotencyRecord, error) {
	if s.pool == nil {
		return nil, pgx.ErrNoRows
	}
	var rec IdempotencyRecord
	query := `
		SELECT key, scope, user_id, request_hash, status_code, response_body
		FROM platform.idempotency_keys
		WHERE key = $1
	`
	var uid *string
	err := s.pool.QueryRow(ctx, query, key).Scan(
		&rec.Key, &rec.Scope, &uid, &rec.RequestHash, &rec.StatusCode, &rec.ResponseBody,
	)
	if err != nil {
		return nil, err
	}
	rec.UserID = uid

	if rec.RequestHash != requestHash {
		return nil, ErrIdempotencyConflict
	}

	return &rec, nil
}

// Save stores the idempotency record.
func (s *IdempotencyStore) Save(ctx context.Context, key, scope, userID, requestHash string, statusCode int, responseBody []byte) error {
	if s.pool == nil {
		return nil
	}
	query := `
		INSERT INTO platform.idempotency_keys (key, scope, user_id, request_hash, status_code, response_body)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (key) DO NOTHING
	`
	var uid interface{} = nil
	if userID != "" {
		uid = userID
	}
	_, err := s.pool.Exec(ctx, query, key, scope, uid, requestHash, statusCode, responseBody)
	if err != nil {
		return fmt.Errorf("failed to save idempotency key: %w", err)
	}
	return nil
}
