package commission

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ListRules(ctx context.Context) ([]CommissionRule, error) {
	query := `
		SELECT id, name, scope_type, coalesce(scope_id::text, ''), rate_percent, priority
		FROM platform.commission_rules
		WHERE is_active = TRUE
		ORDER BY priority DESC, created_at DESC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []CommissionRule
	for rows.Next() {
		var cr CommissionRule
		if err := rows.Scan(&cr.ID, &cr.Name, &cr.ScopeType, &cr.ScopeID, &cr.RatePercent, &cr.Priority); err != nil {
			return nil, err
		}
		rules = append(rules, cr)
	}
	return rules, nil
}
