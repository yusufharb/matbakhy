package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marketplace/core/internal/modules/invoice"
)

type OutboxWorker struct {
	pool      *pgxpool.Pool
	invoiceGen *invoice.Generator
	interval  time.Duration
	stopCh    chan struct{}
}

func NewOutboxWorker(pool *pgxpool.Pool, invoiceGen *invoice.Generator, interval time.Duration) *OutboxWorker {
	if interval <= 0 {
		interval = 2 * time.Second
	}
	return &OutboxWorker{
		pool:       pool,
		invoiceGen: invoiceGen,
		interval:   interval,
		stopCh:     make(chan struct{}),
	}
}

// Start initiates the asynchronous event processing loop
func (w *OutboxWorker) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	go func() {
		log.Println("[Outbox Worker] Asynchronous event worker started")
		for {
			select {
			case <-ctx.Done():
				log.Println("[Outbox Worker] Context cancelled, stopping worker")
				return
			case <-w.stopCh:
				log.Println("[Outbox Worker] Stop signal received, stopping worker")
				return
			case <-ticker.C:
				if err := w.ProcessBatch(ctx, 10); err != nil {
					log.Printf("[Outbox Worker] Error processing batch: %v\n", err)
				}
			}
		}
	}()
}

func (w *OutboxWorker) Stop() {
	close(w.stopCh)
}

type outboxItem struct {
	id          string
	aggregateID string
	eventType   string
	payload     []byte
}

// ProcessBatch locks and processes a batch of unpublished outbox events
func (w *OutboxWorker) ProcessBatch(ctx context.Context, batchSize int) error {
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		SELECT id, aggregate_id, event_type, payload
		FROM platform.outbox_events
		WHERE published = FALSE
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`
	rows, err := tx.Query(ctx, query, batchSize)
	if err != nil {
		return err
	}
	defer rows.Close()

	var items []outboxItem
	for rows.Next() {
		var it outboxItem
		if err := rows.Scan(&it.id, &it.aggregateID, &it.eventType, &it.payload); err == nil {
			items = append(items, it)
		}
	}
	rows.Close()

	if len(items) == 0 {
		return nil
	}

	for _, it := range items {
		var processErr error

		switch it.eventType {
		case "OrderConfirmed":
			// Generate B2B/B2C Tax Invoice asynchronously
			_, processErr = w.invoiceGen.GenerateInvoice(ctx, it.aggregateID)
			if processErr != nil {
				log.Printf("[Outbox Worker] Failed to generate invoice for order %s: %v\n", it.aggregateID, processErr)
			}
		case "OrderCancelled", "OrderPlaced", "PaymentCaptured":
			// Acknowledged events
			processErr = nil
		default:
			log.Printf("[Outbox Worker] Unhandled outbox event type: %s\n", it.eventType)
		}

		if processErr == nil {
			_, _ = tx.Exec(ctx, `
				UPDATE platform.outbox_events
				SET published = TRUE, published_at = NOW()
				WHERE id = $1
			`, it.id)
		} else {
			_, _ = tx.Exec(ctx, `
				UPDATE platform.outbox_events
				SET retry_count = retry_count + 1
				WHERE id = $1
			`, it.id)
		}
	}

	return tx.Commit(ctx)
}

// GetPendingEventCount returns the count of unprocessed outbox events
func (w *OutboxWorker) GetPendingEventCount(ctx context.Context) (int, error) {
	var count int
	err := w.pool.QueryRow(ctx, `SELECT count(*) FROM platform.outbox_events WHERE published = FALSE`).Scan(&count)
	return count, err
}

func (w *OutboxWorker) ParsePayload(payload []byte) map[string]interface{} {
	var m map[string]interface{}
	_ = json.Unmarshal(payload, &m)
	return m
}
