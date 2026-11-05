package wallet_test

import (
	"testing"

	"github.com/marketplace/core/internal/modules/wallet"
)

func BenchmarkComputeJournalEntryHash(b *testing.B) {
	prevHash := "8a41209b5551fa0ef0cb26a575a7c5c065da4a689b9781b2ef420f1883be7eb8"
	entryNumber := "JE-2026-1105-00123"
	referenceType := "order"
	referenceID := "ord-9428-1002-4019"
	action := "order_checkout"
	currency := "USD"
	status := "posted"
	idemKey := "idem-test-key-bench-1002"

	b.ResetTimer()
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = wallet.ComputeJournalEntryHash(prevHash, entryNumber, referenceType, referenceID, action, currency, status, idemKey)
	}
}
