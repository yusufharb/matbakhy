package wallet

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marketplace/core/internal/modules/config"
)

type AccountBalance struct {
	ID          string `json:"id"`
	OwnerType   string `json:"owner_type"`
	OwnerID     string `json:"owner_id"`
	AccountCode string `json:"account_code"`
	Name        string `json:"name"`
	Currency    string `json:"currency"`
	Balance     int64  `json:"balance_cents"` // cents
}

type SupplierWalletSummary struct {
	EscrowPendingCents int64           `json:"escrow_pending_cents"`
	AvailableCents     int64           `json:"available_cents"`
	LifetimeGrossCents int64           `json:"lifetime_gross_cents"`
	Currency           string          `json:"currency"`
	RecentEntries      []JournalEntry  `json:"recent_entries"`
	PayoutRequests     []PayoutRequest `json:"payout_requests"`
}

type PayoutRequest struct {
	ID           string     `json:"id"`
	PayoutNumber string     `json:"payout_number"`
	SupplierID   string     `json:"supplier_id"`
	AmountCents  int64      `json:"amount_cents"`
	Currency     string     `json:"currency"`
	BankName     string     `json:"bank_name"`
	IBAN         string     `json:"iban"`
	Status       string     `json:"status"`
	RiskFlag     string     `json:"risk_flag"`
	CreatedAt    time.Time  `json:"created_at"`
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) ListAccounts(ctx context.Context, ownerID string) ([]AccountBalance, error) {
	query := `
		SELECT a.id, a.owner_type, a.owner_id, a.account_code, a.name, a.currency,
		       coalesce(
		           CASE 
		               WHEN a.account_code LIKE '1%' THEN 
		                   SUM(CASE WHEN l.entry_type = 'debit' THEN l.amount ELSE -l.amount END)
		               ELSE 
		                   SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount ELSE -l.amount END)
		           END, 
		           0
		       ) as balance
		FROM ledger.accounts a
		LEFT JOIN ledger.lines l ON l.account_id = a.id
	`
	if ownerID != "" {
		query += " WHERE a.owner_id = $1"
	}
	query += " GROUP BY a.id ORDER BY a.account_code ASC"

	rows, err := r.pool.Query(ctx, query)
	if ownerID != "" {
		rows, err = r.pool.Query(ctx, query, ownerID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []AccountBalance
	for rows.Next() {
		var ab AccountBalance
		if err := rows.Scan(&ab.ID, &ab.OwnerType, &ab.OwnerID, &ab.AccountCode, &ab.Name, &ab.Currency, &ab.Balance); err != nil {
			return nil, err
		}
		list = append(list, ab)
	}
	return list, nil
}

func (r *Repository) ListJournalEntries(ctx context.Context, limit int) ([]JournalEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, entry_number, reference_type, reference_id, action, description,
		       currency, status, idempotency_key, posted_at
		FROM ledger.journal_entries
		ORDER BY posted_at DESC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []JournalEntry
	for rows.Next() {
		var je JournalEntry
		if err := rows.Scan(
			&je.ID, &je.EntryNumber, &je.ReferenceType, &je.ReferenceID, &je.Action,
			&je.Description, &je.Currency, &je.Status, &je.IdempotencyKey, &je.PostedAt,
		); err != nil {
			return nil, err
		}

		// Fetch lines for this entry
		lineQuery := `
			SELECT l.id, l.account_id, l.entry_type, l.amount
			FROM ledger.lines l
			WHERE l.journal_entry_id = $1
			ORDER BY l.entry_type DESC, l.created_at ASC
		`
		lineRows, err := r.pool.Query(ctx, lineQuery, je.ID)
		if err == nil {
			for lineRows.Next() {
				var line LedgerLine
				if err := lineRows.Scan(&line.ID, &line.AccountID, &line.EntryType, &line.Amount); err == nil {
					je.Lines = append(je.Lines, line)
				}
			}
			lineRows.Close()
		}

		entries = append(entries, je)
	}
	return entries, nil
}

func (r *Repository) PostJournalEntry(ctx context.Context, entry JournalEntry) (*JournalEntry, error) {
	if err := entry.ValidateBalanced(); err != nil {
		return nil, err
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}
	if entry.EntryNumber == "" {
		entry.EntryNumber = fmt.Sprintf("JE-%d", time.Now().UnixNano()%1000000)
	}
	if entry.Currency == "" {
		entry.Currency = "USD"
	}
	if entry.Status == "" {
		entry.Status = "posted"
	}

	headerQuery := `
		INSERT INTO ledger.journal_entries (
			id, entry_number, reference_type, reference_id, action, description, currency, status, idempotency_key, posted_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		RETURNING id, entry_number, reference_type, reference_id, action, description, currency, status, idempotency_key, posted_at
	`
	err = tx.QueryRow(
		ctx, headerQuery,
		entry.ID, entry.EntryNumber, entry.ReferenceType, entry.ReferenceID,
		entry.Action, entry.Description, entry.Currency, entry.Status, entry.IdempotencyKey,
	).Scan(
		&entry.ID, &entry.EntryNumber, &entry.ReferenceType, &entry.ReferenceID,
		&entry.Action, &entry.Description, &entry.Currency, &entry.Status, &entry.IdempotencyKey, &entry.PostedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert journal entry header: %w", err)
	}

	lineQuery := `
		INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
		VALUES ($1, $2, $3, $4, $5)
	`
	for i := range entry.Lines {
		if entry.Lines[i].ID == "" {
			entry.Lines[i].ID = uuid.New().String()
		}
		_, err := tx.Exec(ctx, lineQuery, entry.Lines[i].ID, entry.ID, entry.Lines[i].AccountID, entry.Lines[i].EntryType, entry.Lines[i].Amount)
		if err != nil {
			return nil, fmt.Errorf("failed to insert ledger line: %w", err)
		}
	}

	// Commit executes the deferred constraint trigger to mathematically verify sum(debit) == sum(credit)
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("ledger commit error (invariant violation): %w", err)
	}

	return &entry, nil
}

func (r *Repository) GetSupplierWallet(ctx context.Context, supplierID string) (*SupplierWalletSummary, error) {
	summary := &SupplierWalletSummary{
		Currency: "USD",
	}

	// Escrow Account 2020 balance
	_ = r.pool.QueryRow(ctx, `
		SELECT coalesce(sum(case when l.entry_type = 'credit' then l.amount else -l.amount end), 0)
		FROM ledger.accounts a
		JOIN ledger.lines l ON l.account_id = a.id
		WHERE a.owner_id = $1 AND a.account_code = '2020'
	`, supplierID).Scan(&summary.EscrowPendingCents)

	// Available Account 2030 balance
	_ = r.pool.QueryRow(ctx, `
		SELECT coalesce(sum(case when l.entry_type = 'credit' then l.amount else -l.amount end), 0)
		FROM ledger.accounts a
		JOIN ledger.lines l ON l.account_id = a.id
		WHERE a.owner_id = $1 AND a.account_code = '2030'
	`, supplierID).Scan(&summary.AvailableCents)

	summary.LifetimeGrossCents = summary.EscrowPendingCents + summary.AvailableCents

	// Payout requests
	prows, err := r.pool.Query(ctx, `
		SELECT id, payout_number, supplier_id, amount, currency, bank_name, iban, status, coalesce(risk_flag, 'Clear'), created_at, approved_at
		FROM ledger.payout_requests
		WHERE supplier_id = $1
		ORDER BY created_at DESC
	`, supplierID)
	if err == nil {
		for prows.Next() {
			var pr PayoutRequest
			if err := prows.Scan(&pr.ID, &pr.PayoutNumber, &pr.SupplierID, &pr.AmountCents, &pr.Currency, &pr.BankName, &pr.IBAN, &pr.Status, &pr.RiskFlag, &pr.CreatedAt, &pr.ApprovedAt); err == nil {
				summary.PayoutRequests = append(summary.PayoutRequests, pr)
			}
		}
		prows.Close()
	}

	return summary, nil
}

func (r *Repository) CreatePayoutRequest(ctx context.Context, supplierID string, amountCents int64, currency, bankName, iban string) (*PayoutRequest, error) {
	if amountCents <= 0 {
		return nil, fmt.Errorf("payout amount must be greater than zero")
	}

	payoutCurrency := config.ResolveCurrency(currency)

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Query Supplier Available Payable Account 2030
	var sup2030ID string
	err = tx.QueryRow(ctx, `
		SELECT id FROM ledger.accounts
		WHERE owner_id = $1 AND account_code = '2030'
		LIMIT 1
	`, supplierID).Scan(&sup2030ID)
	if err != nil {
		return nil, fmt.Errorf("supplier available payable account 2030 not found: %w", err)
	}

	// 2. Query available balance: for liability 2030, balance = SUM(credit - debit)
	var availableBalance int64
	err = tx.QueryRow(ctx, `
		SELECT coalesce(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
		FROM ledger.lines
		WHERE account_id = $1
	`, sup2030ID).Scan(&availableBalance)
	if err != nil {
		return nil, fmt.Errorf("failed to query supplier available balance: %w", err)
	}

	// Overdraw prevention guard
	if availableBalance < amountCents {
		return nil, fmt.Errorf("insufficient available balance for payout: available %d cents, requested %d cents", availableBalance, amountCents)
	}

	// 3. Ensure Supplier Payout Hold Account 2040 exists
	var sup2040ID string
	err = tx.QueryRow(ctx, `
		SELECT id FROM ledger.accounts
		WHERE owner_id = $1 AND account_code = '2040'
		LIMIT 1
	`, supplierID).Scan(&sup2040ID)
	if err != nil {
		sup2040ID = uuid.New().String()
		_, err = tx.Exec(ctx, `
			INSERT INTO ledger.accounts (id, owner_type, owner_id, currency, account_code, name)
			VALUES ($1, 'supplier', $2, $3, '2040', 'Supplier Pending Payout Hold')
		`, sup2040ID, supplierID, payoutCurrency)
		if err != nil {
			return nil, fmt.Errorf("failed to create supplier payout hold account 2040: %w", err)
		}
	}

	// 4. Create balanced journal entry: DEBIT 2030 (reduces available), CREDIT 2040 (places funds on hold)
	payoutID := uuid.New().String()
	payoutNumber := fmt.Sprintf("PO-%s-%04d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)
	jeID := uuid.New().String()
	jeNumber := fmt.Sprintf("JE-HOLD-%d-%06d", time.Now().Unix(), (time.Now().UnixNano()/1000)%1000000)

	_, err = tx.Exec(ctx, `
		INSERT INTO ledger.journal_entries (
			id, entry_number, reference_type, reference_id, action, description, currency, status, idempotency_key
		) VALUES ($1, $2, 'payout', $3, 'payout_hold', $4, $5, 'posted', $6)
	`, jeID, jeNumber, payoutID, "Hold for payout "+payoutNumber, payoutCurrency, "idem-hold-"+payoutID)
	if err != nil {
		return nil, fmt.Errorf("failed to create payout hold journal entry: %w", err)
	}

	// DEBIT Account 2030
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
		VALUES (gen_random_uuid(), $1, $2, 'debit', $3)
	`, jeID, sup2030ID, amountCents)
	if err != nil {
		return nil, fmt.Errorf("failed to debit account 2030 for payout hold: %w", err)
	}

	// CREDIT Account 2040
	_, err = tx.Exec(ctx, `
		INSERT INTO ledger.lines (id, journal_entry_id, account_id, entry_type, amount)
		VALUES (gen_random_uuid(), $1, $2, 'credit', $3)
	`, jeID, sup2040ID, amountCents)
	if err != nil {
		return nil, fmt.Errorf("failed to credit account 2040 for payout hold: %w", err)
	}

	// 5. Insert payout request record
	query := `
		INSERT INTO ledger.payout_requests (
			id, payout_number, supplier_id, amount, currency, bank_name, iban, status, risk_flag
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'Clear')
		RETURNING id, payout_number, supplier_id, amount, currency, bank_name, iban, status, risk_flag, created_at
	`
	var pr PayoutRequest
	err = tx.QueryRow(ctx, query, payoutID, payoutNumber, supplierID, amountCents, payoutCurrency, bankName, iban).Scan(
		&pr.ID, &pr.PayoutNumber, &pr.SupplierID, &pr.AmountCents, &pr.Currency, &pr.BankName, &pr.IBAN, &pr.Status, &pr.RiskFlag, &pr.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert payout request: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit payout transaction: %w", err)
	}
	return &pr, nil
}
