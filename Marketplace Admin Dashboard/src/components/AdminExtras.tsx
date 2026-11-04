import { useState } from "react"
import {
  Users,
  ShieldCheck,
  Plus,
  Filter,
  CheckCircle2,
  LockKeyhole,
  SlidersHorizontal,
  Search,
  Globe,
  CircleDollarSign,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  MoreHorizontal,
  ArrowDownRight,
} from "lucide-react"

export function TeamRolesScreen() {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const members = [
    {
      name: "Amal Mansour",
      email: "amal@nexus.market",
      role: "Super Administrator",
      scope: "Platform-wide",
      lastActive: "Just now",
      status: "Active",
    },
    {
      name: "Rami Khoury",
      email: "rami.k@nexus.market",
      role: "Finance Admin",
      scope: "Ledger & Payouts",
      lastActive: "14 min ago",
      status: "Active",
    },
    {
      name: "Layla Mahfouz",
      email: "layla.m@nexus.market",
      role: "Catalog Manager",
      scope: "Categories & Moderation",
      lastActive: "1 hour ago",
      status: "Active",
    },
    {
      name: "Tariq Al-Sayed",
      email: "tariq@nexus.market",
      role: "Compliance Officer",
      scope: "Supplier KYC & Risk",
      lastActive: "Yesterday",
      status: "Active",
    },
    {
      name: "Sarah Jenkins",
      email: "sarah.j@external.com",
      role: "Customer Support Lead",
      scope: "Disputes & Tickets",
      lastActive: "3 days ago",
      status: "Suspended",
    },
  ]

  return (
    <>
      <div className="toolbar">
        <label className="table-search">
          <Search size={15} />
          <input placeholder="Search team member by name or email…" />
        </label>
        <div className="toolbar-right">
          <button className="secondary-btn">
            <Filter size={15} /> Role filter
          </button>
          <button className="primary-btn" onClick={() => setShowInvite(true)}>
            <Plus size={15} /> Invite team member
          </button>
        </div>
      </div>

      <div className="mini-stats">
        <div>
          <span>Total administrators</span>
          <b>14</b>
          <small>Across 4 teams</small>
        </div>
        <div>
          <span>Active sessions</span>
          <b>8</b>
          <small className="positive">All 2FA secured</small>
        </div>
        <div>
          <span>Custom system roles</span>
          <b>6</b>
          <small>RBAC Granular</small>
        </div>
        <div>
          <span>Security status</span>
          <b>100%</b>
          <small className="positive">No policy breaches</small>
        </div>
      </div>

      <section className="card table-card">
        <div className="card-title">
          <div>
            <h3>Platform Administrators</h3>
            <p>Users authorized to govern marketplace operations</p>
          </div>
          <button className="secondary-btn">
            <ArrowDownRight size={14} /> Export CSV
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Permission Scope</th>
                <th>Last Active</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.email}>
                  <td>
                    <div className="company-cell">
                      <span>{m.name.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <b>{m.name}</b>
                        <small
                          style={{ color: "var(--muted)", display: "block" }}
                        >
                          {m.email}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge blue">{m.role}</span>
                  </td>
                  <td>{m.scope}</td>
                  <td>{m.lastActive}</td>
                  <td>
                    <span
                      className={`badge ${
                        m.status === "Active" ? "green" : "red"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <button className="icon-btn">
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showInvite && (
        <div className="drawer-layer">
          <div className="scrim" onClick={() => setShowInvite(false)} />
          <div className="supplier-dialog" style={{ width: 480 }}>
            <div className="supplier-dialog-head">
              <div>
                <span>ACCESS & ROLES</span>
                <h2>Invite Platform Administrator</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowInvite(false)}>
                ✕
              </button>
            </div>
            <div className="dialog-body" style={{ display: "grid", gap: 14 }}>
              {inviteSent ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <CheckCircle2
                    size={40}
                    color="var(--green)"
                    style={{ margin: "0 auto 12px" }}
                  />
                  <h3>Invitation dispatched</h3>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    An activation link with mandatory 2FA setup was emailed.
                  </p>
                </div>
              ) : (
                <>
                  <label>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      Full name
                    </span>
                    <input
                      style={{
                        width: "100%",
                        height: 38,
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: "0 10px",
                        marginTop: 4,
                      }}
                      placeholder="e.g. Zaid Al-Omari"
                    />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      Work email
                    </span>
                    <input
                      style={{
                        width: "100%",
                        height: 38,
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: "0 10px",
                        marginTop: 4,
                      }}
                      placeholder="zaid@nexus.market"
                    />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>Role</span>
                    <select
                      style={{
                        width: "100%",
                        height: 38,
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        padding: "0 10px",
                        marginTop: 4,
                      }}
                    >
                      <option>Finance Admin (Ledger, Approvals)</option>
                      <option>Catalog Manager (Taxonomy, Moderation)</option>
                      <option>Compliance Officer (KYC, Risk)</option>
                      <option>Support Agent (Read-only orders, chats)</option>
                    </select>
                  </label>
                  <div
                    style={{
                      background: "var(--green-soft)",
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 12,
                      color: "var(--green)",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>
                      Requires hardware token or TOTP 2FA before login
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="secondary-btn"
                onClick={() => setShowInvite(false)}
              >
                {inviteSent ? "Close" : "Cancel"}
              </button>
              {!inviteSent && (
                <button
                  className="primary-btn"
                  onClick={() => setInviteSent(true)}
                >
                  <UserCheck size={14} /> Send invitation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function AuditLogScreen() {
  const [filterAction, setFilterAction] = useState("All actions")
  const logs = [
    {
      id: "AUD-99120",
      actor: "Amal Mansour",
      role: "Super Admin",
      action: "KYC_SUPPLIER_APPROVED",
      target: "Noura Foods Trading (SA-1010847291)",
      ip: "192.168.1.12 · Riyadh",
      time: "18 Jun · 15:42:19",
      hash: "0x8f2a...1e4c",
      status: "Verified",
    },
    {
      id: "AUD-99119",
      actor: "Rami Khoury",
      role: "Finance Admin",
      action: "PAYOUT_BATCH_APPROVED",
      target: "3 Payouts ($75,412.00 total)",
      ip: "10.0.4.81 · Internal Gateway",
      time: "18 Jun · 15:10:04",
      hash: "0x17b3...990f",
      status: "Verified",
    },
    {
      id: "AUD-99118",
      actor: "Layla Mahfouz",
      role: "Catalog Manager",
      action: "PRODUCT_MODERATION_APPROVED",
      target: "Nova X1 Headphones (NV-X1-BLK)",
      ip: "192.168.1.44 · Dubai",
      time: "18 Jun · 14:55:31",
      hash: "0x33e8...77ab",
      status: "Verified",
    },
    {
      id: "AUD-99117",
      actor: "System Engine",
      role: "Automated Service",
      action: "LEDGER_ENTRY_POSTED",
      target: "JE-884291 ($8,420.00)",
      ip: "127.0.0.1 · Transaction Worker",
      time: "18 Jun · 14:32:00",
      hash: "0x91df...00ac",
      status: "Verified",
    },
    {
      id: "AUD-99116",
      actor: "Amal Mansour",
      role: "Super Admin",
      action: "COMMISSION_RULE_UPDATED",
      target: "Electronics Override (7.0%)",
      ip: "192.168.1.12 · Riyadh",
      time: "18 Jun · 12:18:44",
      hash: "0xbb44...9981",
      status: "Verified",
    },
  ]

  return (
    <>
      <div className="toolbar">
        <label className="table-search">
          <Search size={15} />
          <input placeholder="Search audit trail by actor, entity ID or action…" />
        </label>
        <div className="toolbar-right">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option>All actions</option>
            <option>KYC actions</option>
            <option>Financial payouts</option>
            <option>Catalog changes</option>
            <option>Policy updates</option>
          </select>
          <button className="secondary-btn">
            <LockKeyhole size={14} /> Verify cryptographic chain
          </button>
        </div>
      </div>

      <section className="card table-card">
        <div className="card-title">
          <div>
            <h3>Immutable Security & Audit Trail</h3>
            <p>
              Append-only cryptographic record of all administrative operations
            </p>
          </div>
          <span className="badge green">
            <ShieldCheck size={12} /> Hash Chain Intact
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Origin IP / Node</th>
                <th>Timestamp</th>
                <th>Proof Hash</th>
                <th>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="mono link">{l.id}</td>
                  <td>
                    <b>{l.actor}</b>
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      {l.role}
                    </small>
                  </td>
                  <td>
                    <span className="badge neutral">{l.action}</span>
                  </td>
                  <td>
                    <b>{l.target}</b>
                  </td>
                  <td className="mono">{l.ip}</td>
                  <td>{l.time}</td>
                  <td className="mono">{l.hash}</td>
                  <td>
                    <span className="badge green">
                      <CheckCircle2 size={10} /> Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

export function PlatformSettingsScreen() {
  const [features, setFeatures] = useState({
    wallet: true,
    chat: true,
    rfq: false,
    moq: true,
    reviews: true,
    multiWarehouse: true,
  })

  const [saved, setSaved] = useState(false)

  const toggle = (key: keyof typeof features) => {
    setFeatures({ ...features, [key]: !features[key] })
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <section className="card" style={{ padding: 18 }}>
        <div
          style={{
            borderBottom: "1px solid var(--line)",
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800 }}>
            Marketplace Identity & Branding
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            Fork configuration for this specific deployment
          </p>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <label>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              Marketplace Name
            </span>
            <input
              defaultValue="NEXUS MARKETPLACE"
              style={{
                width: "100%",
                height: 38,
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "0 10px",
                marginTop: 4,
              }}
            />
          </label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <label>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                Default Base Currency
              </span>
              <select
                defaultValue="USD"
                style={{
                  width: "100%",
                  height: 38,
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "0 10px",
                  marginTop: 4,
                }}
              >
                <option value="USD">USD ($) — US Dollar</option>
                <option value="SAR">SAR (ر.س) — Saudi Riyal</option>
                <option value="EGP">EGP (ج.م) — Egyptian Pound</option>
                <option value="EUR">EUR (€) — Euro</option>
              </select>
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                Default Language
              </span>
              <select
                defaultValue="en"
                style={{
                  width: "100%",
                  height: 38,
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "0 10px",
                  marginTop: 4,
                }}
              >
                <option value="en">English (LTR)</option>
                <option value="ar">العربية (RTL)</option>
              </select>
            </label>
          </div>
          <label>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              Global Default Commission Rate
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              <input
                type="number"
                defaultValue={10}
                style={{
                  width: 100,
                  height: 38,
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  padding: "0 10px",
                  fontFamily: "DM Mono",
                }}
              />
              <span style={{ fontWeight: 700 }}>%</span>
              <small style={{ color: "var(--muted)", marginLeft: 8 }}>
                Can be overridden per category or supplier agreement
              </small>
            </div>
          </label>
          <button
            className="primary-btn"
            style={{ width: "fit-content", marginTop: 12 }}
            onClick={handleSave}
          >
            {saved ? <CheckCircle2 size={14} /> : null}
            {saved ? "Settings Saved" : "Save Platform Settings"}
          </button>
        </div>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div
          style={{
            borderBottom: "1px solid var(--line)",
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800 }}>
            Feature Flags & Modular Engine
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            Enable or disable modules dynamically for this deployment
          </p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            {
              key: "wallet" as const,
              label: "Merchant Wallet & Financial Ledger",
              desc: "Allow buyers to deposit funds and pay using internal balances",
            },
            {
              key: "moq" as const,
              label: "Minimum Order Quantity (MOQ) Engine",
              desc: "Enforce volume threshold purchasing for wholesale/B2B models",
            },
            {
              key: "chat" as const,
              label: "Buyer-Supplier Realtime Messaging",
              desc: "Enable direct in-app conversations attached to suborders",
            },
            {
              key: "reviews" as const,
              label: "Verified Customer Reviews & Ratings",
              desc: "Allow buyers who completed delivery to post ratings",
            },
            {
              key: "multiWarehouse" as const,
              label: "Multi-Warehouse Inventory Allocation",
              desc: "Allow vendors to manage multiple fulfillment hubs",
            },
            {
              key: "rfq" as const,
              label: "RFQ & Custom Quotations Engine",
              desc: "Allow business buyers to request tailored bulk quotes",
            },
          ].map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: features[item.key] ? "#fff" : "#f7f9f8",
              }}
            >
              <div>
                <b style={{ fontSize: 12, display: "block" }}>{item.label}</b>
                <small
                  style={{
                    color: "var(--muted)",
                    fontSize: 10,
                    display: "block",
                  }}
                >
                  {item.desc}
                </small>
              </div>
              <button
                className={`toggle ${features[item.key] ? "on" : ""}`}
                onClick={() => toggle(item.key)}
              >
                <i />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
