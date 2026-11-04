package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps the pgxpool.Pool
type DB struct {
	Pool *pgxpool.Pool
}

// Connect establishes a connection pool to PostgreSQL
func Connect(ctx context.Context) (*DB, error) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres@127.0.0.1:5432/marketplace_core?sslmode=disable"
	}

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("error parsing db config: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	// Verify connection
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	log.Printf("[Database] Connected successfully to PostgreSQL at %s", config.ConnConfig.Host)
	return &DB{Pool: pool}, nil
}

// Close closes the database connection pool
func (d *DB) Close() {
	if d.Pool != nil {
		d.Pool.Close()
	}
}
