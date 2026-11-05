/**
 * Stage A Security Verification Script
 * Proves:
 * 1. Unauthenticated requests get 401
 * 2. Backdoor passwords ('password', 'admin123') are rejected (401)
 * 3. Legitimate login works and issues valid JWT
 * 4. Supplier token trying to access admin endpoint gets 403 Forbidden
 * 5. Supplier querying another supplier's suborders/wallet gets 403 Forbidden
 * 6. Supplier querying their own suborders/wallet gets 200 OK
 */

const API_BASE = 'http://localhost:8080/api/v1';

async function test() {
  console.log('=== Stage A Security & RBAC Live Verification ===\n');

  // 1. Unauthenticated request to protected admin endpoint
  console.log('Test 1: Unauthenticated request to /admin/suppliers');
  const res1 = await fetch(`${API_BASE}/admin/suppliers`);
  console.log(`  -> Status: ${res1.status} (Expected: 401)`);
  if (res1.status !== 401) throw new Error(`Test 1 Failed: Expected 401, got ${res1.status}`);

  // 2. Backdoor password login attempt ('password')
  console.log('\nTest 2: Backdoor login attempt with "password"');
  const res2 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amal@nexus.market', password: 'password' })
  });
  console.log(`  -> Status: ${res2.status} (Expected: 401)`);
  if (res2.status !== 401) throw new Error(`Test 2 Failed: Backdoor accepted! Status: ${res2.status}`);

  // 3. Backdoor password login attempt ('admin123')
  console.log('\nTest 3: Backdoor login attempt with "admin123"');
  const res3 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amal@nexus.market', password: 'admin123' })
  });
  console.log(`  -> Status: ${res3.status} (Expected: 401)`);
  if (res3.status !== 401) throw new Error(`Test 3 Failed: Backdoor accepted! Status: ${res3.status}`);

  // 4. Legitimate Admin Login
  console.log('\nTest 4: Legitimate Admin login with real credentials');
  const res4 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'amal@nexus.market', password: 'NexusPassword2026!' })
  });
  console.log(`  -> Status: ${res4.status} (Expected: 200)`);
  if (res4.status !== 200) throw new Error(`Test 4 Failed: Login failed with status: ${res4.status}`);
  const adminData = await res4.json();
  const adminToken = adminData.token;
  console.log(`  -> Role: ${adminData.role}, User: ${adminData.user.email}`);

  // 5. Legitimate Supplier Login
  console.log('\nTest 5: Legitimate Supplier login (Noura Foods)');
  const res5 = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'supplier@nourafoods.com', password: 'NexusPassword2026!' })
  });
  console.log(`  -> Status: ${res5.status} (Expected: 200)`);
  if (res5.status !== 200) throw new Error(`Test 5 Failed: Supplier login failed: ${res5.status}`);
  const supplierData = await res5.json();
  const supplierToken = supplierData.token;
  console.log(`  -> Role: ${supplierData.role}, OrgID: ${supplierData.memberships[0]?.org_id}`);

  // 6. Supplier accessing Admin endpoint (Must get 403 Forbidden)
  console.log('\nTest 6: Supplier token accessing platform admin endpoint (/admin/suppliers)');
  const res6 = await fetch(`${API_BASE}/admin/suppliers`, {
    headers: { 'Authorization': `Bearer ${supplierToken}` }
  });
  console.log(`  -> Status: ${res6.status} (Expected: 403)`);
  if (res6.status !== 403) throw new Error(`Test 6 Failed: Expected 403, got ${res6.status}`);

  // 7. Supplier attempting to read another supplier's suborders
  console.log('\nTest 7: Supplier A attempting to read Supplier B suborders (?supplier_id=b0000000-0000-0000-0000-000000000003)');
  const res7 = await fetch(`${API_BASE}/supplier/suborders?supplier_id=b0000000-0000-0000-0000-000000000003`, {
    headers: { 'Authorization': `Bearer ${supplierToken}` }
  });
  console.log(`  -> Status: ${res7.status} (Expected: 403)`);
  if (res7.status !== 403) throw new Error(`Test 7 Failed: Expected 403, got ${res7.status}`);

  // 8. Supplier reading their own suborders
  console.log('\nTest 8: Supplier reading their own suborders');
  const res8 = await fetch(`${API_BASE}/supplier/suborders`, {
    headers: { 'Authorization': `Bearer ${supplierToken}` }
  });
  console.log(`  -> Status: ${res8.status} (Expected: 200)`);
  if (res8.status !== 200) throw new Error(`Test 8 Failed: Expected 200, got ${res8.status}`);
  const subordersData = await res8.json();
  console.log(`  -> Returned ${subordersData.count} suborders for supplier ${subordersData.supplier_id}`);

  // 9. Supplier attempting to read another supplier's wallet
  console.log('\nTest 9: Supplier A reading Supplier B wallet (?supplier_id=b0000000-0000-0000-0000-000000000003)');
  const res9 = await fetch(`${API_BASE}/supplier/wallet?supplier_id=b0000000-0000-0000-0000-000000000003`, {
    headers: { 'Authorization': `Bearer ${supplierToken}` }
  });
  console.log(`  -> Status: ${res9.status} (Expected: 403)`);
  if (res9.status !== 403) throw new Error(`Test 9 Failed: Expected 403, got ${res9.status}`);

  // 10. Supplier reading their own wallet
  console.log('\nTest 10: Supplier reading their own wallet');
  const res10 = await fetch(`${API_BASE}/supplier/wallet`, {
    headers: { 'Authorization': `Bearer ${supplierToken}` }
  });
  console.log(`  -> Status: ${res10.status} (Expected: 200)`);
  if (res10.status !== 200) throw new Error(`Test 10 Failed: Expected 200, got ${res10.status}`);
  const walletData = await res10.json();
  console.log(`  -> Escrow pending: $${(walletData.escrow_pending_cents / 100).toFixed(2)}, Available: $${(walletData.available_cents / 100).toFixed(2)}`);

  console.log('\nALL 10 STAGE A SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

test().catch(err => {
  console.error('\nTEST RUN FAILED:', err);
  process.exit(1);
});
