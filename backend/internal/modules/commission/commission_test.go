package commission_test

import (
	"testing"

	"github.com/marketplace/core/internal/modules/commission"
)

func TestCommissionPrecedenceResolution(t *testing.T) {
	rules := []commission.CommissionRule{
		{ID: "r-1", Name: "Global Marketplace Default", ScopeType: "global", RatePercent: 10.0, Priority: 0},
		{ID: "r-2", Name: "Electronics Override", ScopeType: "category", ScopeID: "cat-electronics", RatePercent: 7.0, Priority: 10},
		{ID: "r-3", Name: "Atlas Custom Agreement", ScopeType: "supplier", ScopeID: "sup-atlas", RatePercent: 5.5, Priority: 20},
	}

	// 1. Supplier custom rule should take precedence over category and global
	res1 := commission.ResolveEffectiveCommission(rules, "sup-atlas", "cat-electronics")
	if res1.EffectiveRatePercent != 5.5 {
		t.Errorf("expected 5.5%% for Atlas, got %f%%", res1.EffectiveRatePercent)
	}
	if res1.AppliedScope != "supplier" {
		t.Errorf("expected supplier scope, got %s", res1.AppliedScope)
	}

	// 2. Category rule should take precedence over global when no supplier rule exists
	res2 := commission.ResolveEffectiveCommission(rules, "sup-noura", "cat-electronics")
	if res2.EffectiveRatePercent != 7.0 {
		t.Errorf("expected 7.0%% for electronics, got %f%%", res2.EffectiveRatePercent)
	}
	if res2.AppliedScope != "category" {
		t.Errorf("expected category scope, got %s", res2.AppliedScope)
	}

	// 3. Global default applies when neither supplier nor category matches
	res3 := commission.ResolveEffectiveCommission(rules, "sup-noura", "cat-apparel")
	if res3.EffectiveRatePercent != 10.0 {
		t.Errorf("expected 10.0%% global default, got %f%%", res3.EffectiveRatePercent)
	}
	if res3.AppliedScope != "global" {
		t.Errorf("expected global scope, got %s", res3.AppliedScope)
	}
}

func TestIntegerBasisPointsCommission(t *testing.T) {
	// 1. Verify integer basis points precision calculation
	// 1000 bps = 10.00%
	comm1 := commission.CalculateCommission(10000, 1000)
	if comm1 != 1000 {
		t.Fatalf("expected 1000 cents commission, got %d", comm1)
	}

	// 550 bps = 5.50% on 1500 cents ($15.00)
	// (1500 * 550 + 5000) / 10000 = (825000 + 5000) / 10000 = 830000 / 10000 = 83 cents
	comm2 := commission.CalculateCommission(1500, 550)
	if comm2 != 83 {
		t.Fatalf("expected 83 cents commission, got %d", comm2)
	}

	// Boundary condition: zero and negative inputs
	if commission.CalculateCommission(0, 500) != 0 {
		t.Fatalf("expected 0 for zero subtotal")
	}
	if commission.CalculateCommission(1000, 0) != 0 {
		t.Fatalf("expected 0 for zero rate")
	}

	// 2. Verify rule resolution provides EffectiveRateBps
	rules := []commission.CommissionRule{
		{ID: "r-1", Name: "Global Marketplace Default", ScopeType: "global", RateBps: 1000, Priority: 0},
		{ID: "r-2", Name: "Atlas Custom Agreement", ScopeType: "supplier", ScopeID: "sup-atlas", RateBps: 550, Priority: 20},
	}

	res := commission.ResolveEffectiveCommission(rules, "sup-atlas", "cat-any")
	if res.EffectiveRateBps != 550 {
		t.Fatalf("expected EffectiveRateBps 550, got %d", res.EffectiveRateBps)
	}
}

