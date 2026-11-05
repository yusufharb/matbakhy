// Test script for Stage B Financial P0 verification
const API_BASE = "http://localhost:8080/api/v1";

async function runTests() {
  console.log("=== Stage B Financial P0 Verification Suite ===\n");

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return { status: res.status, data: await res.json() };
  }

  const merchantLogin = await login("buyer@meridian.com", "NexusPassword2026!");
  const merchantToken = merchantLogin.data.token;
  const merchantOrgID = merchantLogin.data.memberships[0]?.org_id;

  const supplierLogin = await login("supplier@nourafoods.com", "NexusPassword2026!");
  const supplierToken = supplierLogin.data.token;
  const supplierOrgID = supplierLogin.data.memberships[0]?.org_id;

  // 1. Test missing Idempotency-Key on checkout -> 400
  console.log("--- Item 2: Idempotency-Key Header Enforcement ---");
  const checkoutPayload = {
    merchant_id: merchantOrgID,
    payment_method: "wallet",
    items: [{ offer_id: "f0000000-0000-0000-0000-000000000001", quantity: 1 }],
  };

  const noIdemRes = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${merchantToken}`,
    },
    body: JSON.stringify(checkoutPayload),
  });
  console.log(`Test 1.1: Checkout without Idempotency-Key -> Status ${noIdemRes.status} (Expected: 400)`);
  if (noIdemRes.status !== 400) throw new Error("Expected 400 for missing Idempotency-Key");

  // 2. Test initial checkout with Idempotency-Key
  const idemKey = `idem-live-test-${Date.now()}`;
  const checkoutRes = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${merchantToken}`,
      "Idempotency-Key": idemKey,
    },
    body: JSON.stringify(checkoutPayload),
  });
  console.log(`Test 1.2: Checkout with Idempotency-Key -> Status ${checkoutRes.status} (Expected: 201)`);
  if (checkoutRes.status !== 201) {
    const errText = await checkoutRes.text();
    throw new Error(`Checkout failed: ${errText}`);
  }
  const checkoutData = await checkoutRes.json();
  const firstOrderID = checkoutData.parent_order.id;

  // 3. Test replay with SAME key and SAME payload
  const replayRes = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${merchantToken}`,
      "Idempotency-Key": idemKey,
    },
    body: JSON.stringify(checkoutPayload),
  });
  console.log(`Test 1.3: Replay with same key & same payload -> Status ${replayRes.status} (Expected: 201)`);
  if (replayRes.status !== 201) throw new Error("Replay failed");
  const replayData = await replayRes.json();
  if (replayData.parent_order.id !== firstOrderID) {
    throw new Error(`Expected replay order ID ${firstOrderID}, got ${replayData.parent_order.id}`);
  }
  const replayHeader = replayRes.headers.get("x-idempotent-replay");
  console.log(`  -> X-Idempotent-Replay header present: ${replayHeader === "true"}`);

  // 4. Test conflict: SAME key with DIFFERENT payload -> 409
  const diffPayload = {
    merchant_id: merchantOrgID,
    payment_method: "wallet",
    items: [{ offer_id: "f0000000-0000-0000-0000-000000000001", quantity: 2 }],
  };
  const conflictRes = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${merchantToken}`,
      "Idempotency-Key": idemKey,
    },
    body: JSON.stringify(diffPayload),
  });
  console.log(`Test 1.4: Idempotent replay with different payload -> Status ${conflictRes.status} (Expected: 409)`);
  if (conflictRes.status !== 409) throw new Error("Expected 409 for conflict");

  // 5. Test Payout overdraw prevention
  console.log("\n--- Item 5: Payout Overdraw Prevention & Atomic Hold ---");
  const overdrawRes = await fetch(`${API_BASE}/supplier/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supplierToken}`,
      "Idempotency-Key": `payout-overdraw-${Date.now()}`,
    },
    body: JSON.stringify({
      supplier_id: supplierOrgID,
      amount_cents: 999999999, // $9.9M overdraw attempt
      currency: "USD",
      bank_name: "Saudi National Bank",
      iban: "SA0380000000608010167519",
    }),
  });
  console.log(`Test 2.1: Payout overdraw request -> Status ${overdrawRes.status} (Expected: 400 Bad Request)`);
  if (overdrawRes.status !== 400) throw new Error("Expected 400 for payout overdraw");
  const overdrawErr = await overdrawRes.json();
  console.log(`  -> Rejection message: "${overdrawErr.error}"`);
  if (!overdrawErr.error.includes("insufficient available balance")) {
    throw new Error("Expected error to mention insufficient available balance");
  }

  // 6. Test Payout missing Idempotency-Key -> 400
  const noIdemPayoutRes = await fetch(`${API_BASE}/supplier/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supplierToken}`,
    },
    body: JSON.stringify({
      supplier_id: supplierOrgID,
      amount_cents: 1000,
      currency: "USD",
      bank_name: "Saudi National Bank",
      iban: "SA0380000000608010167519",
    }),
  });
  console.log(`Test 2.2: Payout without Idempotency-Key -> Status ${noIdemPayoutRes.status} (Expected: 400)`);
  if (noIdemPayoutRes.status !== 400) throw new Error("Expected 400 for missing Idempotency-Key on payout");

  // 7. Dynamic Currency Checkout Test
  console.log("\n--- Item 3: Dynamic Currency Propagation ---");
  const sarIdemKey = `sar-checkout-${Date.now()}`;
  const sarRes = await fetch(`${API_BASE}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${merchantToken}`,
      "Idempotency-Key": sarIdemKey,
    },
    body: JSON.stringify({
      merchant_id: merchantOrgID,
      currency: "SAR",
      payment_method: "gateway",
      items: [{ offer_id: "f0000000-0000-0000-0000-000000000001", quantity: 1 }],
    }),
  });
  console.log(`Test 3.1: Checkout with explicit SAR currency -> Status ${sarRes.status} (Expected: 201)`);
  if (sarRes.status !== 201) throw new Error("SAR checkout failed");
  const sarData = await sarRes.json();
  console.log(`  -> Order Currency: ${sarData.parent_order.currency} (Expected: SAR)`);
  if (sarData.parent_order.currency !== "SAR") throw new Error("Expected currency SAR");

  console.log("\n>>> ALL STAGE B VERIFICATION TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
