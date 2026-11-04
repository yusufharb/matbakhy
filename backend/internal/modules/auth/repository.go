package auth

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT id, email, phone, password_hash, first_name, last_name, avatar_url,
		       email_verified, phone_verified, status, locale, timezone, last_login_at,
		       created_at, updated_at
		FROM iam.users
		WHERE LOWER(email) = LOWER($1)
	`
	var u User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.Phone, &u.PasswordHash, &u.FirstName, &u.LastName, &u.AvatarURL,
		&u.EmailVerified, &u.PhoneVerified, &u.Status, &u.Locale, &u.Timezone, &u.LastLoginAt,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (*User, error) {
	query := `
		SELECT id, email, phone, password_hash, first_name, last_name, avatar_url,
		       email_verified, phone_verified, status, locale, timezone, last_login_at,
		       created_at, updated_at
		FROM iam.users
		WHERE id = $1
	`
	var u User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.Phone, &u.PasswordHash, &u.FirstName, &u.LastName, &u.AvatarURL,
		&u.EmailVerified, &u.PhoneVerified, &u.Status, &u.Locale, &u.Timezone, &u.LastLoginAt,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) GetMembershipsForUser(ctx context.Context, userID string) ([]Membership, error) {
	query := `
		SELECT m.id, m.user_id, m.org_id, coalesce(r.name, 'member') as role_name,
		       o.type as org_type, o.name::text as org_name, m.status, m.created_at
		FROM iam.org_memberships m
		JOIN iam.organizations o ON o.id = m.org_id
		LEFT JOIN iam.roles r ON r.id = m.role_id
		WHERE m.user_id = $1
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Membership
	for rows.Next() {
		var m Membership
		if err := rows.Scan(&m.ID, &m.UserID, &m.OrgID, &m.RoleName, &m.OrgType, &m.OrgName, &m.Status, &m.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, nil
}

func (r *Repository) CreateUserWithOrg(ctx context.Context, req RegisterRequest, passwordHash string) (*User, *Organization, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)

	userID := uuid.New().String()
	userQuery := `
		INSERT INTO iam.users (id, email, password_hash, first_name, last_name, email_verified, status, locale)
		VALUES ($1, $2, $3, $4, $5, TRUE, 'active', 'en')
		RETURNING id, email, first_name, last_name, email_verified, status, locale, created_at, updated_at
	`
	var u User
	err = tx.QueryRow(ctx, userQuery, userID, req.Email, passwordHash, req.FirstName, req.LastName).Scan(
		&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.EmailVerified, &u.Status, &u.Locale, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert user: %w", err)
	}

	orgID := uuid.New().String()
	orgNameJSON, _ := json.Marshal(map[string]string{"en": req.OrgName, "ar": req.OrgName})
	orgType := req.OrgType
	if orgType == "" {
		orgType = "merchant"
	}
	orgStatus := "approved"
	if orgType == "supplier" {
		orgStatus = "submitted" // suppliers need admin approval
	}

	orgQuery := `
		INSERT INTO iam.organizations (id, type, name, legal_name, commercial_reg_no, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, type, name, status, country_code, created_at, updated_at
	`
	var org Organization
	var nameBytes []byte
	err = tx.QueryRow(ctx, orgQuery, orgID, orgType, orgNameJSON, req.OrgName, req.CommercialRegNo, orgStatus).Scan(
		&org.ID, &org.Type, &nameBytes, &org.Status, &org.CountryCode, &org.CreatedAt, &org.UpdatedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert organization: %w", err)
	}
	org.Name = nameBytes

	// Find or assign role
	var roleID string
	err = tx.QueryRow(ctx, `SELECT id FROM iam.roles WHERE scope = $1 LIMIT 1`, orgType).Scan(&roleID)
	if err != nil {
		// create a role if not found
		roleID = uuid.New().String()
		_, _ = tx.Exec(ctx, `INSERT INTO iam.roles (id, name, scope) VALUES ($1, $2, $3)`, roleID, orgType+"_owner", orgType)
	}

	// Membership
	memQuery := `
		INSERT INTO iam.org_memberships (user_id, org_id, role_id, status)
		VALUES ($1, $2, $3, 'active')
	`
	_, err = tx.Exec(ctx, memQuery, u.ID, org.ID, roleID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to insert membership: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	return &u, &org, nil
}

func (r *Repository) ListSuppliers(ctx context.Context, status string) ([]Organization, error) {
	baseQuery := `
		SELECT id, type, name, legal_name, tax_id, commercial_reg_no, country_code, logo_url, status, metadata, created_at, updated_at
		FROM iam.organizations
		WHERE type = 'supplier'
	`
	var rows pgx.Rows
	var err error
	if status != "" {
		rows, err = r.pool.Query(ctx, baseQuery+" AND status = $1 ORDER BY created_at DESC", status)
	} else {
		rows, err = r.pool.Query(ctx, baseQuery+" ORDER BY created_at DESC")
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []Organization
	for rows.Next() {
		var o Organization
		var nameBytes, metaBytes []byte
		if err := rows.Scan(
			&o.ID, &o.Type, &nameBytes, &o.LegalName, &o.TaxID, &o.CommercialRegNo,
			&o.CountryCode, &o.LogoURL, &o.Status, &metaBytes, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		o.Name = nameBytes
		o.Metadata = metaBytes
		orgs = append(orgs, o)
	}
	return orgs, nil
}

func (r *Repository) UpdateSupplierStatus(ctx context.Context, orgID, status string) error {
	query := `UPDATE iam.organizations SET status = $1, updated_at = NOW() WHERE id = $2 AND type = 'supplier'`
	ct, err := r.pool.Exec(ctx, query, status, orgID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return fmt.Errorf("supplier not found")
	}
	return nil
}
