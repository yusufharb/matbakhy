package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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

// CreateCustomerUser registers a standalone retail customer without creating any organization
func (r *Repository) CreateCustomerUser(ctx context.Context, req RegisterCustomerRequest, passwordHash string) (*User, error) {
	userID := uuid.New().String()
	userQuery := `
		INSERT INTO iam.users (id, email, phone, password_hash, first_name, last_name, email_verified, status, locale)
		VALUES ($1, $2, $3, $4, $5, $6, TRUE, 'active', 'en')
		RETURNING id, email, first_name, last_name, email_verified, status, locale, created_at, updated_at
	`
	var phone *string
	if req.Phone != "" {
		phone = &req.Phone
	}

	var u User
	err := r.pool.QueryRow(ctx, userQuery, userID, req.Email, phone, passwordHash, req.FirstName, req.LastName).Scan(
		&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.EmailVerified, &u.Status, &u.Locale, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to register customer user: %w", err)
	}
	return &u, nil
}

// GetContexts queries all contexts (personal customer profile + organization memberships) for a user
func (r *Repository) GetContexts(ctx context.Context, userID string) (*UserContextsResponse, error) {
	u, err := r.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	memberships, err := r.GetMembershipsForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user memberships: %w", err)
	}

	return &UserContextsResponse{
		UserID:        u.ID,
		Email:         u.Email,
		HasB2CProfile: true, // All registered users have a personal retail shopping profile
		Memberships:   memberships,
	}, nil
}

// SwitchContext validates membership and issues a context-bound token
func (r *Repository) SwitchContext(ctx context.Context, userID, targetType, targetOrgID string) (*SwitchContextResponse, error) {
	u, err := r.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	var activeCtx ActiveContext
	var tokenRole, tokenOrgID, tokenCtxType string

	if targetType == "b2c_customer" || targetType == "customer" {
		tokenRole = "customer"
		tokenOrgID = ""
		tokenCtxType = "b2c_customer"
		activeCtx = ActiveContext{
			Type:        "b2c_customer",
			Role:        "customer",
			Permissions: []string{"catalog:read", "cart:manage", "order:create_b2c", "wallet:use_b2c"},
		}
	} else if targetType == "merchant" || targetType == "supplier" {
		if targetOrgID == "" {
			return nil, fmt.Errorf("target_org_id is required for organization context")
		}

		// Verify membership and organization status
		query := `
			SELECT m.status, coalesce(r.name, 'member'), o.type, coalesce(o.legal_name, o.name->>'en'), o.status
			FROM iam.org_memberships m
			JOIN iam.organizations o ON o.id = m.org_id
			LEFT JOIN iam.roles r ON r.id = m.role_id
			WHERE m.user_id = $1 AND m.org_id = $2
		`
		var memStatus, roleName, orgType, orgName, orgStatus string
		err := r.pool.QueryRow(ctx, query, userID, targetOrgID).Scan(&memStatus, &roleName, &orgType, &orgName, &orgStatus)
		if err != nil {
			return nil, fmt.Errorf("user does not have access to this organization: %w", err)
		}

		if memStatus != "active" {
			return nil, fmt.Errorf("user membership in this organization is %s", memStatus)
		}

		if orgStatus == "suspended" {
			return nil, fmt.Errorf("organization is suspended")
		}

		tokenRole = roleName
		tokenOrgID = targetOrgID
		tokenCtxType = orgType

		activeCtx = ActiveContext{
			Type:        orgType,
			OrgID:       targetOrgID,
			OrgName:     orgName,
			OrgStatus:   orgStatus,
			Role:        roleName,
			Permissions: []string{"catalog:read", "order:manage", "wallet:manage"},
		}
	} else {
		return nil, fmt.Errorf("invalid target_context_type: %s", targetType)
	}

	token, err := GenerateContextJWT(u.ID, u.Email, tokenOrgID, tokenRole, tokenCtxType)
	if err != nil {
		return nil, fmt.Errorf("failed to generate context token: %w", err)
	}

	plainRefresh, hashRefresh, err := GenerateRefreshToken()
	var refreshToken string
	if err == nil {
		_ = r.CreateSession(ctx, u.ID, hashRefresh, time.Now().Add(7*24*time.Hour))
		refreshToken = plainRefresh
	}

	return &SwitchContextResponse{
		Token:         token,
		RefreshToken:  refreshToken,
		ActiveContext: activeCtx,
	}, nil
}

// KYC Document Methods
func (r *Repository) ListKYCDocuments(ctx context.Context, orgID string) ([]KYCDocument, error) {
	query := `
		SELECT id, organization_id, document_type, file_name, file_url, status,
		       submitted_by::text, reviewed_by::text, review_notes, created_at, updated_at
		FROM iam.kyc_documents
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []KYCDocument
	for rows.Next() {
		var d KYCDocument
		if err := rows.Scan(
			&d.ID, &d.OrganizationID, &d.DocumentType, &d.FileName, &d.FileURL, &d.Status,
			&d.SubmittedBy, &d.ReviewedBy, &d.ReviewNotes, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (r *Repository) SubmitKYCDocument(ctx context.Context, orgID, userID string, req SubmitKYCDocumentRequest) (*KYCDocument, error) {
	docID := uuid.New().String()
	query := `
		INSERT INTO iam.kyc_documents (id, organization_id, document_type, file_name, file_url, status, submitted_by)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6)
		RETURNING id, organization_id, document_type, file_name, file_url, status, created_at, updated_at
	`
	var d KYCDocument
	err := r.pool.QueryRow(ctx, query, docID, orgID, req.DocumentType, req.FileName, req.FileURL, userID).Scan(
		&d.ID, &d.OrganizationID, &d.DocumentType, &d.FileName, &d.FileURL, &d.Status, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save kyc document: %w", err)
	}
	return &d, nil
}

func (r *Repository) ReviewKYCDocument(ctx context.Context, docID, reviewerID string, req ReviewKYCDocumentRequest) error {
	query := `
		UPDATE iam.kyc_documents
		SET status = $1, reviewed_by = $2, review_notes = $3, updated_at = NOW()
		WHERE id = $4
	`
	ct, err := r.pool.Exec(ctx, query, req.Status, reviewerID, req.ReviewNotes, docID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return fmt.Errorf("kyc document not found")
	}
	return nil
}

// Team Member & Invitation Methods
func (r *Repository) ListTeamMembers(ctx context.Context, orgID string) ([]TeamMember, error) {
	query := `
		SELECT m.id, m.user_id, m.org_id, coalesce(r.name, 'member') as role_name,
		       u.first_name, u.last_name, u.email, m.status, m.created_at
		FROM iam.org_memberships m
		JOIN iam.users u ON u.id = m.user_id
		LEFT JOIN iam.roles r ON r.id = m.role_id
		WHERE m.org_id = $1
		ORDER BY m.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []TeamMember
	for rows.Next() {
		var tm TeamMember
		if err := rows.Scan(
			&tm.ID, &tm.UserID, &tm.OrgID, &tm.RoleName,
			&tm.FirstName, &tm.LastName, &tm.Email, &tm.Status, &tm.CreatedAt,
		); err != nil {
			return nil, err
		}
		members = append(members, tm)
	}
	return members, nil
}

func (r *Repository) InviteTeamMember(ctx context.Context, orgID, invitedByID string, req InviteTeamMemberRequest) (*TeamInvitation, error) {
	inviteID := uuid.New().String()
	token := fmt.Sprintf("inv_%s_%d", uuid.New().String()[:12], time.Now().Unix())
	expiresAt := time.Now().Add(48 * time.Hour)

	query := `
		INSERT INTO iam.team_invitations (id, organization_id, email, role_name, token, status, expires_at, invited_by)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
		RETURNING id, organization_id, email, role_name, token, status, expires_at, created_at
	`
	var inv TeamInvitation
	err := r.pool.QueryRow(ctx, query, inviteID, orgID, req.Email, req.RoleName, token, expiresAt, invitedByID).Scan(
		&inv.ID, &inv.OrganizationID, &inv.Email, &inv.RoleName, &inv.Token, &inv.Status, &inv.ExpiresAt, &inv.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create team invitation: %w", err)
	}
	return &inv, nil
}
