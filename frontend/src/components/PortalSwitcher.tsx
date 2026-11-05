import { useState } from "react"
import {
  ShieldCheck,
  Store,
  ShoppingBag,
  Globe,
  Building2,
  User,
  ChevronDown,
} from "lucide-react"
import type { PortalMode, Locale } from "../types"

interface Props {
  portal: PortalMode
  setPortal: (p: PortalMode) => void
  locale: Locale
  setLocale: (l: Locale) => void
}

export function PortalSwitcher({
  portal,
  setPortal,
  locale,
  setLocale,
}: Props) {
  const isRtl = locale === "ar"
  const [showContextDropdown, setShowContextDropdown] = useState(false)

  // Map legacy 'merchant' to 'b2b' for highlighting
  const currentMode = portal === "merchant" ? "b2b" : portal

  return (
    <div
      style={{
        height: 52,
        background: "#090d16",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        fontFamily: "'Cairo', sans-serif",
        borderBottom: "1px solid #1e293b",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Brand & System Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "grid",
              placeItems: "center",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
            }}
          >
            N
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: isRtl ? "0" : "0.04em",
              color: "#ffffff",
            }}
          >
            {isRtl ? "نظام نكسوس الموحد" : "NEXUS CORE"}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 12,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            {isRtl ? "مباشر 8080" : "LIVE 8080"}
          </span>
        </div>
      </div>

      {/* Switcher Pills (4 Portals: B2C, B2B, Supplier, Admin) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#111827",
          padding: "4px 6px",
          borderRadius: 10,
          border: "1px solid #1f2937",
        }}
      >
        {/* B2C Consumer Storefront */}
        <button
          onClick={() => setPortal("b2c")}
          style={{
            border: 0,
            background:
              currentMode === "b2c"
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "transparent",
            color: currentMode === "b2c" ? "#ffffff" : "#94a3b8",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow:
              currentMode === "b2c"
                ? "0 2px 6px rgba(16, 185, 129, 0.35)"
                : "none",
          }}
        >
          <ShoppingBag size={16} />
          <span>{isRtl ? "متجر المستهلك (B2C)" : "Consumer Store (B2C)"}</span>
        </button>

        {/* B2B Merchant Procurement Portal */}
        <button
          onClick={() => setPortal("b2b")}
          style={{
            border: 0,
            background:
              currentMode === "b2b"
                ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                : "transparent",
            color: currentMode === "b2b" ? "#ffffff" : "#94a3b8",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow:
              currentMode === "b2b"
                ? "0 2px 6px rgba(37, 99, 235, 0.35)"
                : "none",
          }}
        >
          <Building2 size={16} />
          <span>{isRtl ? "بوابة الشركات (B2B)" : "B2B Procurement"}</span>
        </button>

        {/* Supplier Portal */}
        <button
          onClick={() => setPortal("supplier")}
          style={{
            border: 0,
            background:
              currentMode === "supplier"
                ? "linear-gradient(135deg, #059669, #047857)"
                : "transparent",
            color: currentMode === "supplier" ? "#ffffff" : "#94a3b8",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow:
              currentMode === "supplier"
                ? "0 2px 6px rgba(5, 150, 105, 0.35)"
                : "none",
          }}
        >
          <Store size={16} />
          <span>{isRtl ? "بوابة الموردين" : "Supplier"}</span>
        </button>

        {/* Admin Dashboard */}
        <button
          onClick={() => setPortal("admin")}
          style={{
            border: 0,
            background:
              currentMode === "admin"
                ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                : "transparent",
            color: currentMode === "admin" ? "#ffffff" : "#94a3b8",
            padding: "6px 14px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            transition: "all 0.18s ease",
            boxShadow:
              currentMode === "admin"
                ? "0 2px 6px rgba(124, 58, 237, 0.35)"
                : "none",
          }}
        >
          <ShieldCheck size={16} />
          <span>{isRtl ? "الإدارة المركزية" : "Admin"}</span>
        </button>
      </div>

      {/* Right Controls: Context Switcher + Language Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Active Identity Context Badge */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowContextDropdown(!showContextDropdown)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid #334155",
              padding: "5px 12px",
              borderRadius: 8,
              color: "#f8fafc",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {currentMode === "b2b" ? (
              <Building2 size={14} color="#60a5fa" />
            ) : (
              <User size={14} color="#34d399" />
            )}
            <span>
              {currentMode === "b2b"
                ? isRtl
                  ? "مجموعة الأمل (B2B)"
                  : "Al-Amal Retail (B2B)"
                : isRtl
                  ? "سارة الزهراني (B2C)"
                  : "Sara (Consumer)"}
            </span>
            <ChevronDown size={14} color="#94a3b8" />
          </button>

          {/* Context Dropdown Menu */}
          {showContextDropdown && (
            <div
              style={{
                position: "absolute",
                top: 42,
                right: isRtl ? "auto" : 0,
                left: isRtl ? 0 : "auto",
                background: "#111827",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "8px",
                width: 240,
                boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                zIndex: 60,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  padding: "4px 8px",
                }}
              >
                {isRtl ? "سياق الحساب النشط" : "SWITCH ACCOUNT CONTEXT"}
              </div>

              <button
                onClick={() => {
                  setPortal("b2b")
                  setShowContextDropdown(false)
                }}
                style={{
                  width: "100%",
                  textAlign: isRtl ? "right" : "left",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: 0,
                  background:
                    currentMode === "b2b"
                      ? "rgba(37, 99, 235, 0.15)"
                      : "transparent",
                  color: currentMode === "b2b" ? "#60a5fa" : "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <Building2 size={14} />
                <div>
                  <div>Al-Amal Retail Group</div>
                  <small style={{ color: "#34d399" }}>
                    Approved B2B Merchant
                  </small>
                </div>
              </button>

              <button
                onClick={() => {
                  setPortal("b2c")
                  setShowContextDropdown(false)
                }}
                style={{
                  width: "100%",
                  textAlign: isRtl ? "right" : "left",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: 0,
                  background:
                    currentMode === "b2c"
                      ? "rgba(16, 185, 129, 0.15)"
                      : "transparent",
                  color: currentMode === "b2c" ? "#34d399" : "#cbd5e1",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <User size={14} />
                <div>
                  <div>Sara Al-Zahrani</div>
                  <small style={{ color: "#94a3b8" }}>
                    Personal Retail Shopper
                  </small>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          style={{
            border: "1px solid #334155",
            background: "rgba(255, 255, 255, 0.05)",
            color: "#f8fafc",
            padding: "5px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title={isRtl ? "Switch to English" : "التبديل إلى العربية"}
        >
          <Globe size={14} color="#34d399" />
          <span>{locale === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>
    </div>
  )
}
