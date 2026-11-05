package auth

import (
	"encoding/json"
	"time"
)

type User struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	Phone         *string    `json:"phone,omitempty"`
	PasswordHash  string     `json:"-"`
	FirstName     string     `json:"first_name"`
	LastName      string     `json:"last_name"`
	AvatarURL     *string    `json:"avatar_url,omitempty"`
	EmailVerified bool       `json:"email_verified"`
	PhoneVerified bool       `json:"phone_verified"`
	Status        string     `json:"status"`
	Locale        string     `json:"locale"`
	Timezone      string     `json:"timezone"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Organization struct {
	ID              string          `json:"id"`
	Type            string          `json:"type"` // 'platform', 'supplier', 'merchant'
	Name            json.RawMessage `json:"name"` // {"en": "...", "ar": "..."}
	LegalName       *string         `json:"legal_name,omitempty"`
	TaxID           *string         `json:"tax_id,omitempty"`
	CommercialRegNo *string         `json:"commercial_reg_no,omitempty"`
	CountryCode     string          `json:"country_code"`
	LogoURL         *string         `json:"logo_url,omitempty"`
	Status          string          `json:"status"` // 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended'
	Metadata        json.RawMessage `json:"metadata,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type Membership struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	OrgID     string    `json:"org_id"`
	RoleName  string    `json:"role_name"`
	OrgType   string    `json:"org_type"`
	OrgName   string    `json:"org_name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	OrgName         string `json:"org_name"`
	OrgType         string `json:"org_type"` // 'supplier' or 'merchant'
	CommercialRegNo string `json:"commercial_reg_no,omitempty"`
}

type AuthResponse struct {
	Token        string         `json:"token"`
	RefreshToken string         `json:"refresh_token,omitempty"`
	User         User           `json:"user"`
	Organization *Organization  `json:"organization,omitempty"`
	Role         string         `json:"role"`
	Memberships  []Membership   `json:"memberships"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshTokenResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
}

type RegisterCustomerRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone,omitempty"`
}

type SwitchContextRequest struct {
	TargetContextType string `json:"target_context_type"` // "merchant" | "b2c_customer" | "supplier"
	TargetOrgID       string `json:"target_org_id,omitempty"`
}

type ActiveContext struct {
	Type        string   `json:"type"` // "merchant" | "b2c_customer" | "supplier" | "platform"
	OrgID       string   `json:"org_id,omitempty"`
	OrgName     string   `json:"org_name,omitempty"`
	OrgStatus   string   `json:"org_status,omitempty"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

type SwitchContextResponse struct {
	Token         string        `json:"token"`
	RefreshToken  string        `json:"refresh_token"`
	ActiveContext ActiveContext `json:"active_context"`
}

type UserContextsResponse struct {
	UserID        string       `json:"user_id"`
	Email         string       `json:"email"`
	HasB2CProfile bool         `json:"has_b2c_profile"`
	Memberships   []Membership `json:"memberships"`
}

type KYCDocument struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	DocumentType   string     `json:"document_type"`
	FileName       string     `json:"file_name"`
	FileURL        string     `json:"file_url"`
	Status         string     `json:"status"`
	SubmittedBy    *string    `json:"submitted_by,omitempty"`
	ReviewedBy     *string    `json:"reviewed_by,omitempty"`
	ReviewNotes    *string    `json:"review_notes,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type SubmitKYCDocumentRequest struct {
	DocumentType string `json:"document_type"`
	FileName     string `json:"file_name"`
	FileURL      string `json:"file_url"`
}

type ReviewKYCDocumentRequest struct {
	Status      string `json:"status"` // "approved" | "rejected"
	ReviewNotes string `json:"review_notes,omitempty"`
}

type TeamMember struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	OrgID     string    `json:"org_id"`
	RoleName  string    `json:"role_name"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type TeamInvitation struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Email          string    `json:"email"`
	RoleName       string    `json:"role_name"`
	Token          string    `json:"token"`
	Status         string    `json:"status"`
	ExpiresAt      time.Time `json:"expires_at"`
	InvitedBy      *string   `json:"invited_by,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type InviteTeamMemberRequest struct {
	Email    string `json:"email"`
	RoleName string `json:"role_name"`
}

