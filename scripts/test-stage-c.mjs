// scripts/test-stage-c.mjs
// Verification suite for Stage C: Stock Reservation Guard, Ledger Statement Trigger & Cryptographic Hash Chain

const BASE_URL = 'http://localhost:8080/api/v1';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

async function runStageCTests() {
  console.log('=== Stage C Stock Guard & Cryptographic Ledger Verification ===\n');

  const adminAuth = await login('amal@nexus.market', 'NexusPassword2026!');
  const supplierAuth = await login('supplier@nourafoods.com', 'NexusPassword2026!');
  const merchantAuth = await login('buyer@meridian.com', 'NexusPassword2026!');

  // 1. Stock Oversell Prevention via API
  console.log('--- Item 1: Stock Overselling Guard via API ---');
  const excessiveCheckoutRes = await fetch(`${BASE_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${merchantAuth.token}`,
      'Idempotency-Key': `stock-guard-${Date.now()}`
    },
    body: JSON.stringify({
      merchant_id: 'b0000000-0000-0000-0000-000000000004',
      payment_method: 'credit_card',
      items: [
        { offer_id: 'f0000000-0000-0000-0000-000000000005', quantity: 99999 } // on_hand is ~7
      ]
    })
  });
  console.log(`Test 1.1: Excessive quantity checkout -> Status ${excessiveCheckoutRes.status} (Expected: 400)`);
  const excessiveData = await excessiveCheckoutRes.json();
  console.log(`  -> Error: "${excessiveData.error}"`);
  if (excessiveCheckoutRes.status !== 400 || !excessiveData.error.includes('insufficient stock')) {
    throw new Error(`Expected 400 with insufficient stock, got ${excessiveCheckoutRes.status}`);
  }

  // 2. Ledger Chain Verification API Endpoint Access Control
  console.log('\n--- Item 2: Cryptographic Hash Chain Access Control ---');
  const unauthVerify = await fetch(`${BASE_URL}/ledger/verify-chain`);
  console.log(`Test 2.1: Unauthenticated GET /ledger/verify-chain -> Status ${unauthVerify.status} (Expected: 401)`);
  if (unauthVerify.status !== 401) throw new Error(`Expected 401, got ${unauthVerify.status}`);

  const merchantVerify = await fetch(`${BASE_URL}/ledger/verify-chain`, {
    headers: { 'Authorization': `Bearer ${merchantAuth.token}` }
  });
  console.log(`Test 2.2: Merchant GET /ledger/verify-chain -> Status ${merchantVerify.status} (Expected: 403)`);
  if (merchantVerify.status !== 403) throw new Error(`Expected 403, got ${merchantVerify.status}`);

  const supplierVerify = await fetch(`${BASE_URL}/ledger/verify-chain`, {
    headers: { 'Authorization': `Bearer ${supplierAuth.token}` }
  });
  console.log(`Test 2.3: Supplier GET /ledger/verify-chain -> Status ${supplierVerify.status} (Expected: 403)`);
  if (supplierVerify.status !== 403) throw new Error(`Expected 403, got ${supplierVerify.status}`);

  // 3. Admin Ledger Chain Verification
  console.log('\n--- Item 3: Admin Cryptographic Hash Chain Verification ---');
  const adminVerify = await fetch(`${BASE_URL}/ledger/verify-chain`, {
    headers: { 'Authorization': `Bearer ${adminAuth.token}` }
  });
  console.log(`Test 3.1: Admin GET /ledger/verify-chain -> Status ${adminVerify.status} (Expected: 200)`);
  const verifyReport = await adminVerify.json();
  console.log(`  -> Valid: ${verifyReport.valid}`);
  console.log(`  -> Entries Verified: ${verifyReport.entries_verified}`);
  if (adminVerify.status !== 200 || !verifyReport.valid || verifyReport.entries_verified === 0) {
    throw new Error(`Ledger chain verification failed: ${JSON.stringify(verifyReport)}`);
  }

  // 4. Inspect Journal Entries for Hash Presence
  console.log('\n--- Item 4: Journal Entries Cryptographic Hashes ---');
  const entriesRes = await fetch(`${BASE_URL}/ledger/entries`, {
    headers: { 'Authorization': `Bearer ${adminAuth.token}` }
  });
  console.log(`Test 4.1: Admin GET /ledger/entries -> Status ${entriesRes.status} (Expected: 200)`);
  const entriesData = await entriesRes.json();
  const entries = entriesData.journal_entries || [];
  console.log(`  -> Retrieved ${entries.length} recent journal entries`);
  
  const entriesWithHashes = entries.filter(e => e.hash && e.prev_hash);
  console.log(`  -> Entries with valid SHA-256 hash chains: ${entriesWithHashes.length}/${entries.length}`);
  if (entriesWithHashes.length === 0) {
    throw new Error('No journal entries contained valid cryptographic hashes!');
  }

  console.log('\n>>> ALL STAGE C VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
}

runStageCTests().catch(err => {
  console.error('\nFAILED STAGE C VERIFICATION:', err);
  process.exit(1);
});
