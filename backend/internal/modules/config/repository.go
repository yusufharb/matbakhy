package config

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CMSSection struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	SectionType string          `json:"section_type"`
	SortOrder   int             `json:"sort_order"`
	IsActive    bool            `json:"is_active"`
	ContentEN   json.RawMessage `json:"content_en"`
	ContentAR   json.RawMessage `json:"content_ar"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type AuditLog struct {
	ID             string          `json:"id"`
	ActorID        *string         `json:"actor_id,omitempty"`
	ActorName      string          `json:"actor_name"`
	ActorRole      string          `json:"actor_role"`
	Action         string          `json:"action"`
	TargetResource string          `json:"target_resource"`
	OriginIP       string          `json:"origin_ip"`
	ProofHash      string          `json:"proof_hash"`
	Details        json.RawMessage `json:"details"`
	CreatedAt      time.Time       `json:"created_at"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ListCMSSections(ctx context.Context) ([]CMSSection, error) {
	query := `
		SELECT id, name, section_type, sort_order, is_active, content_en, content_ar, updated_at
		FROM platform.cms_sections
		ORDER BY sort_order ASC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sections []CMSSection
	for rows.Next() {
		var s CMSSection
		var enBytes, arBytes []byte
		if err := rows.Scan(&s.ID, &s.Name, &s.SectionType, &s.SortOrder, &s.IsActive, &enBytes, &arBytes, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.ContentEN = enBytes
		s.ContentAR = arBytes
		sections = append(sections, s)
	}
	return sections, nil
}

func (r *Repository) UpdateCMSSection(ctx context.Context, id string, en, ar json.RawMessage, isActive bool) error {
	query := `
		UPDATE platform.cms_sections
		SET content_en = $1, content_ar = $2, is_active = $3, updated_at = NOW()
		WHERE id = $4
	`
	_, err := r.pool.Exec(ctx, query, en, ar, isActive, id)
	return err
}

func (r *Repository) ListAuditLogs(ctx context.Context, limit int) ([]AuditLog, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, actor_id, actor_name, actor_role, action, target_resource, origin_ip, proof_hash, details, created_at
		FROM platform.audit_logs
		ORDER BY created_at DESC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var l AuditLog
		var det []byte
		if err := rows.Scan(&l.ID, &l.ActorID, &l.ActorName, &l.ActorRole, &l.Action, &l.TargetResource, &l.OriginIP, &l.ProofHash, &det, &l.CreatedAt); err != nil {
			return nil, err
		}
		l.Details = det
		logs = append(logs, l)
	}
	return logs, nil
}
