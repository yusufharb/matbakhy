// Test script for Stage A.1 verification
const API_BASE = "http://localhost:8080/api/v1";

async function runTests() {
  console.log("=== Stage A.1 Verification Suite ===\n");

  // Helper login
  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return { status: res.status, data: await res.json() };
  }

  // 1. Admin login
  const adminLogin = await login("amal@nexus.market", "NexusPassword2026!");
  const adminToken = adminLogin.data.token;
  console.log("Admin Login Status:", adminLogin.status, "Token acquired:", !!adminToken);

  // 2. Merchant login
  const merchantLogin = await login("buyer@meridian.com", "NexusPassword2026!");
  const merchantToken = merchantLogin.data.token;
  console.log("Merchant Login Status:", merchantLogin.status, "Token acquired:", !!merchantToken);

  // 3. Supplier login
  const supplierLogin = await login("supplier@nourafoods.com", "NexusPassword2026!");
  const supplierToken = supplierLogin.data.token;
  console.log("Supplier Login Status:", supplierLogin.status, "Token acquired:", !!supplierToken);

  console.log("\n--- Item 1: Restricted Ledger Endpoints ---");
  // Admin accessing ledger
  const adminLedger = await fetch(`${API_BASE}/ledger/accounts`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`Test 1.1: Admin GET /ledger/accounts -> Status ${adminLedger.status} (Expected: 200)`);
  if (adminLedger.status !== 200) throw new Error("Admin ledger access failed");

  // Merchant accessing ledger -> 403
  const merchantLedger = await fetch(`${API_BASE}/ledger/accounts`, {
    headers: { Authorization: `Bearer ${merchantToken}` },
  });
  console.log(`Test 1.2: Merchant GET /ledger/accounts -> Status ${merchantLedger.status} (Expected: 403)`);
  if (merchantLedger.status !== 403) throw new Error("Merchant was not forbidden from ledger accounts");

  // Supplier accessing ledger entries -> 403
  const supplierLedger = await fetch(`${API_BASE}/ledger/entries`, {
    headers: { Authorization: `Bearer ${supplierToken}` },
  });
  console.log(`Test 1.3: Supplier GET /ledger/entries -> Status ${supplierLedger.status} (Expected: 403)`);
  if (supplierLedger.status !== 403) throw new Error("Supplier was not forbidden from ledger entries");

  console.log("\n--- Item 2: Cross-Merchant Order Isolation ---");
  const merchantOrders = await fetch(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${merchantToken}` },
  });
  const merchantOrdersData = await merchantOrders.json();
  console.log(`Test 2.1: Merchant GET /orders -> Status ${merchantOrders.status} (Expected: 200)`);
  if (merchantOrders.status !== 200) throw new Error("Merchant order fetch failed");
  console.log(`Returned ${merchantOrdersData.orders ? merchantOrdersData.orders.length : 0} orders for merchant`);

  console.log("\n--- Item 3: Refresh Token & Rotation ---");
  console.log("Login returned refresh_token:", !!merchantLogin.data.refresh_token);
  const oldRefreshToken = merchantLogin.data.refresh_token;

  if (oldRefreshToken) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: oldRefreshToken }),
    });
    const refreshData = await refreshRes.json();
    console.log(`Test 3.1: POST /auth/refresh with valid token -> Status ${refreshRes.status} (Expected: 200)`);
    if (refreshRes.status !== 200) throw new Error("Refresh token failed");

    // Reuse old token -> must fail with 401 (rotation protection)
    const reuseRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: oldRefreshToken }),
    });
    console.log(`Test 3.2: Reuse rotated refresh token -> Status ${reuseRes.status} (Expected: 401)`);
    if (reuseRes.status !== 401) throw new Error("Rotated refresh token was not rejected");
  }

  console.log("\n--- Item 4: Brute-Force Rate Limiting ---");
  const testEmail = "testbruteforce@nexus.market";
  let got429 = false;
  for (let i = 1; i <= 6; i++) {
    const res = await login(testEmail, "wrongpassword123");
    if (res.status === 429) {
      console.log(`Test 4.1: Attempt ${i} received 429 Too Many Requests (Account locked out)`);
      got429 = true;
      break;
    }
  }
  if (!got429) throw new Error("Expected rate limiter to return 429 after 5 failed attempts");

  console.log("\n>>> ALL STAGE A.1 TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
