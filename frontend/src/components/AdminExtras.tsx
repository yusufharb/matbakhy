import { useState } from "react"

import {
  Users,
  ShieldCheck,
  Plus,
  Filter,
  CheckCircle2,
  LockKeyhole,
  Search,
  UserCheck,
  MoreHorizontal,
  ArrowDownRight,
} from "lucide-react"

import type { Locale } from "../types"

interface ScreenProps {
  locale?: Locale
}

export function TeamRolesScreen({ locale = "en" }: ScreenProps) {
  const isRtl = locale === "ar"

  const [showInvite, setShowInvite] = useState(false)

  const [inviteSent, setInviteSent] = useState(false)

  const members = [
    {
      name: isRtl ? "أمل منصور" : "Amal Mansour",

      email: "amal@nexus.market",

      role: isRtl ? "مدير نظام عام (Super Admin)" : "Super Administrator",

      scope: isRtl ? "كامل المنصة" : "Platform-wide",

      lastActive: isRtl ? "الآن" : "Just now",

      status: "Active",
    },

    {
      name: isRtl ? "رامي خوري" : "Rami Khoury",

      email: "rami.k@nexus.market",

      role: isRtl ? "مسؤول مالي" : "Finance Admin",

      scope: isRtl ? "الدفتر المالي والتحويلات" : "Ledger & Payouts",

      lastActive: isRtl ? "قبل 14 دقيقة" : "14 min ago",

      status: "Active",
    },

    {
      name: isRtl ? "ليلى محفوظ" : "Layla Mahfouz",

      email: "layla.m@nexus.market",

      role: isRtl ? "مديرة الكتالوج" : "Catalog Manager",

      scope: isRtl ? "الفئات وتدقيق المنتجات" : "Categories & Moderation",

      lastActive: isRtl ? "قبل ساعة" : "1 hour ago",

      status: "Active",
    },

    {
      name: isRtl ? "طارق السيد" : "Tariq Al-Sayed",

      email: "tariq@nexus.market",

      role: isRtl ? "مسؤول الامتثال والمخاطر" : "Compliance Officer",

      scope: isRtl ? "تأهيل الموردين KYC والمخاطر" : "Supplier KYC & Risk",

      lastActive: isRtl ? "أمس" : "Yesterday",

      status: "Active",
    },

    {
      name: isRtl ? "سارة جنكينز" : "Sarah Jenkins",

      email: "sarah.j@external.com",

      role: isRtl ? "مسؤولة دعم العملاء" : "Customer Support Lead",

      scope: isRtl ? "النزاعات والتذاكر" : "Disputes & Tickets",

      lastActive: isRtl ? "قبل 3 أيام" : "3 days ago",

      status: "Suspended",
    },
  ]

  return (
    <>
      <div className="toolbar">
        <label className="table-search">
          <Search size={15} />
          <input
            placeholder={
              isRtl
                ? "ابحث عن عضو فريق بالاسم أو البريد الإلكتروني…"
                : "Search team member by name or email…"
            }
          />
        </label>
        <div className="toolbar-right">
          <button className="secondary-btn">
            <Filter size={15} /> {isRtl ? "تصفية الأدوار" : "Role filter"}
          </button>
          <button className="primary-btn" onClick={() => setShowInvite(true)}>
            <Plus size={15} /> {isRtl ? "دعوة عضو جديد" : "Invite team member"}
          </button>
        </div>
      </div>

      <div className="mini-stats">
        <div>
          <span>{isRtl ? "إجمالي المسؤولين" : "Total administrators"}</span>
          <b>14</b>
          <small>{isRtl ? "موزعون على 4 فرق" : "Across 4 teams"}</small>
        </div>
        <div>
          <span>{isRtl ? "الجلسات النشطة" : "Active sessions"}</span>
          <b>8</b>
          <small className="positive">
            {isRtl ? "محمية بالتحقق الثنائي 2FA" : "All 2FA secured"}
          </small>
        </div>
        <div>
          <span>{isRtl ? "الأدوار المخصصة" : "Custom system roles"}</span>
          <b>6</b>
          <small>{isRtl ? "صلاحيات RBAC دقيقة" : "RBAC Granular"}</small>
        </div>
        <div>
          <span>{isRtl ? "حالة الأمان" : "Security status"}</span>
          <b>100%</b>
          <small className="positive">
            {isRtl ? "امتثال كامل للسياسات" : "No policy breaches"}
          </small>
        </div>
      </div>

      <section className="card table-card">
        <div className="card-title">
          <div>
            <h3>
              {isRtl ? "مسؤولو وموظفو المنصة" : "Platform Administrators"}
            </h3>
            <p>
              {isRtl
                ? "المستخدمون المصرح لهم بإدارة عمليات السوق وصلاحيات التشغيل"
                : "Users authorized to govern marketplace operations"}
            </p>
          </div>
          <button className="secondary-btn">
            <ArrowDownRight size={14} className="rtl-flip" />{" "}
            {isRtl ? "تصدير CSV" : "Export CSV"}
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{isRtl ? "عضو الفريق" : "Member"}</th>
                <th>{isRtl ? "الدور والصلاحية" : "Role"}</th>
                <th>{isRtl ? "نطاق الصلاحيات" : "Permission Scope"}</th>
                <th>{isRtl ? "آخر نشاط" : "Last Active"}</th>
                <th>{isRtl ? "الحالة" : "Status"}</th>
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
                      {m.status === "Active"
                        ? isRtl
                          ? "نشط"
                          : "Active"
                        : isRtl
                          ? "معلق"
                          : "Suspended"}
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
                <span>
                  {isRtl ? "إدارة الوصول والصلاحيات" : "ACCESS & ROLES"}
                </span>
                <h2>
                  {isRtl
                    ? "دعوة مسؤول منصة جديد"
                    : "Invite Platform Administrator"}
                </h2>
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
                  <h3>{isRtl ? "تم إرسال الدعوة" : "Invitation dispatched"}</h3>
                  <p
                    style={{
                      color: "var(--muted)",

                      fontSize: 13,

                      marginTop: 4,
                    }}
                  >
                    {isRtl
                      ? "تم إرسال رابط التفعيل مع إلزامية إعداد التحقق الثنائي عبر البريد."
                      : "An activation link with mandatory 2FA setup was emailed."}
                  </p>
                </div>
              ) : (
                <>
                  <label>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {isRtl ? "الاسم الكامل" : "Full name"}
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
                      placeholder={
                        isRtl ? "مثال: زيد العمري" : "e.g. Zaid Al-Omari"
                      }
                    />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {isRtl ? "البريد الإلكتروني للعمل" : "Work email"}
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
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {isRtl ? "الدور الوظيفي والصلاحيات" : "Role"}
                    </span>
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
                      <option>
                        {isRtl
                          ? "مسؤول مالي (الدفتر، التحويلات، التسويات)"
                          : "Finance Admin (Ledger, Approvals)"}
                      </option>
                      <option>
                        {isRtl
                          ? "مدير الكتالوج (التصنيفات، تدقيق المنتجات)"
                          : "Catalog Manager (Taxonomy, Moderation)"}
                      </option>
                      <option>
                        {isRtl
                          ? "مسؤول الامتثال (تأهيل الموردين KYC، المخاطر)"
                          : "Compliance Officer (KYC, Risk)"}
                      </option>
                      <option>
                        {isRtl
                          ? "موظف دعم (عرض الطلبات، المحادثات)"
                          : "Support Agent (Read-only orders, chats)"}
                      </option>
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
                      {isRtl
                        ? "يتطلب مفتاح أمان مادي أو تطبيق 2FA للدخول"
                        : "Requires hardware token or TOTP 2FA before login"}
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
                {inviteSent
                  ? isRtl
                    ? "إغلاق"
                    : "Close"
                  : isRtl
                    ? "إلغاء"
                    : "Cancel"}
              </button>
              {!inviteSent && (
                <button
                  className="primary-btn"
                  onClick={() => setInviteSent(true)}
                >
                  <UserCheck size={14} />{" "}
                  {isRtl ? "إرسال الدعوة" : "Send invitation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function AuditLogScreen({ locale = "en" }: ScreenProps) {
  const isRtl = locale === "ar"

  const [filterAction, setFilterAction] = useState("All actions")

  const logs = [
    {
      id: "AUD-99120",

      actor: isRtl ? "أمل منصور" : "Amal Mansour",

      role: isRtl ? "مدير عام" : "Super Admin",

      action: "KYC_SUPPLIER_APPROVED",

      target: isRtl
        ? "مؤسسة نورة للمنتجات (SA-1010847291)"
        : "Noura Foods Trading (SA-1010847291)",

      ip: "192.168.1.12 · Riyadh",

      time: isRtl ? "18 يونيو · 15:42:19" : "18 Jun · 15:42:19",

      hash: "0x8f2a...1e4c",

      status: "Verified",
    },

    {
      id: "AUD-99119",

      actor: isRtl ? "رامي خوري" : "Rami Khoury",

      role: isRtl ? "مسؤول مالي" : "Finance Admin",

      action: "PAYOUT_BATCH_APPROVED",

      target: isRtl
        ? "3 تسويات مالية (إجمالي $75,412.00)"
        : "3 Payouts ($75,412.00 total)",

      ip: "10.0.4.81 · Internal Gateway",

      time: isRtl ? "18 يونيو · 15:10:04" : "18 Jun · 15:10:04",

      hash: "0x17b3...990f",

      status: "Verified",
    },

    {
      id: "AUD-99118",

      actor: isRtl ? "ليلى محفوظ" : "Layla Mahfouz",

      role: isRtl ? "مديرة الكتالوج" : "Catalog Manager",

      action: "PRODUCT_MODERATION_APPROVED",

      target: isRtl
        ? "سماعات نوفا إكس 1 (NV-X1-BLK)"
        : "Nova X1 Headphones (NV-X1-BLK)",

      ip: "192.168.1.44 · Dubai",

      time: isRtl ? "18 يونيو · 14:55:31" : "18 Jun · 14:55:31",

      hash: "0x33e8...77ab",

      status: "Verified",
    },

    {
      id: "AUD-99117",

      actor: isRtl ? "محرك النظام" : "System Engine",

      role: isRtl ? "خدمة تلقائية" : "Automated Service",

      action: "LEDGER_ENTRY_POSTED",

      target: "JE-884291 ($8,420.00)",

      ip: "127.0.0.1 · Transaction Worker",

      time: isRtl ? "18 يونيو · 14:32:00" : "18 Jun · 14:32:00",

      hash: "0x91df...00ac",

      status: "Verified",
    },

    {
      id: "AUD-99116",

      actor: isRtl ? "أمل منصور" : "Amal Mansour",

      role: isRtl ? "مدير عام" : "Super Admin",

      action: "COMMISSION_RULE_UPDATED",

      target: isRtl
        ? "استثناء فئة الإلكترونيات (7.0%)"
        : "Electronics Override (7.0%)",

      ip: "192.168.1.12 · Riyadh",

      time: isRtl ? "18 يونيو · 12:18:44" : "18 Jun · 12:18:44",

      hash: "0xbb44...9981",

      status: "Verified",
    },
  ]

  return (
    <>
      <div className="toolbar">
        <label className="table-search">
          <Search size={15} />
          <input
            placeholder={
              isRtl
                ? "ابحث في سجل التدقيق بالفاعل، المعرف أو الإجراء…"
                : "Search audit trail by actor, entity ID or action…"
            }
          />
        </label>
        <div className="toolbar-right">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="All actions">
              {isRtl ? "جميع العمليات" : "All actions"}
            </option>
            <option value="KYC actions">
              {isRtl ? "عمليات تأهيل الموردين KYC" : "KYC actions"}
            </option>
            <option value="Financial payouts">
              {isRtl ? "التحويلات والتسويات المالية" : "Financial payouts"}
            </option>
            <option value="Catalog changes">
              {isRtl ? "تعديلات الكتالوج العام" : "Catalog changes"}
            </option>
            <option value="Policy updates">
              {isRtl ? "تحديثات السياسات والعمولات" : "Policy updates"}
            </option>
          </select>
          <button className="secondary-btn">
            <LockKeyhole size={14} />{" "}
            {isRtl ? "التحقق من السلسلة المشفرة" : "Verify cryptographic chain"}
          </button>
        </div>
      </div>

      <section className="card table-card">
        <div className="card-title">
          <div>
            <h3>
              {isRtl
                ? "سجل التدقيق والأمان غير القابل للتعديل"
                : "Immutable Security & Audit Trail"}
            </h3>
            <p>
              {isRtl
                ? "سجل مشفر ذو إضافة تسلسلية فقط لكافة العمليات الإدارية والمالية"
                : "Append-only cryptographic record of all administrative operations"}
            </p>
          </div>
          <span className="badge green">
            <ShieldCheck size={12} />{" "}
            {isRtl ? "سلسلة التجزئة سليمة 100%" : "Hash Chain Intact"}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{isRtl ? "معرف السجل" : "Audit ID"}</th>
                <th>{isRtl ? "الفاعل" : "Actor"}</th>
                <th>{isRtl ? "نوع الإجراء" : "Action"}</th>
                <th>{isRtl ? "الهدف المتأثر" : "Target Resource"}</th>
                <th>{isRtl ? "عنوان IP والمصدر" : "Origin IP / Node"}</th>
                <th>{isRtl ? "التوقيت" : "Timestamp"}</th>
                <th>{isRtl ? "بصمة التجزئة" : "Proof Hash"}</th>
                <th>{isRtl ? "حالة النزاهة" : "Integrity"}</th>
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
                      <CheckCircle2 size={10} />{" "}
                      {isRtl ? "تم التحقق" : "Verified"}
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

export function PlatformSettingsScreen({ locale = "en" }: ScreenProps) {
  const isRtl = locale === "ar"

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
            {isRtl
              ? "هوية المنصة والعلامة التجارية"
              : "Marketplace Identity & Branding"}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            {isRtl
              ? "تخصيص إعدادات هذه النسخة المتفرعة من السوق الموحد"
              : "Fork configuration for this specific deployment"}
          </p>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <label>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {isRtl ? "اسم المنصة التجاري" : "Marketplace Name"}
            </span>
            <input
              defaultValue={isRtl ? "سوق نكسوس الموحد" : "NEXUS MARKETPLACE"}
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
                {isRtl ? "العملة الأساسية" : "Default Base Currency"}
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
                <option value="USD">
                  USD ($) — {isRtl ? "دولار أمريكي" : "US Dollar"}
                </option>
                <option value="SAR">
                  SAR (ر.س) — {isRtl ? "ريال سعودي" : "Saudi Riyal"}
                </option>
                <option value="EGP">
                  EGP (ج.م) — {isRtl ? "جنيه مصري" : "Egyptian Pound"}
                </option>
                <option value="EUR">EUR (€) — {isRtl ? "يورو" : "Euro"}</option>
              </select>
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {isRtl ? "اللغة الافتراضية" : "Default Language"}
              </span>
              <select
                defaultValue="ar"
                style={{
                  width: "100%",

                  height: 38,

                  border: "1px solid var(--line)",

                  borderRadius: 6,

                  padding: "0 10px",

                  marginTop: 4,
                }}
              >
                <option value="ar">العربية (RTL - Cairo)</option>
                <option value="en">English (LTR)</option>
              </select>
            </label>
          </div>
          <label>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {isRtl
                ? "نسبة العمولة الافتراضية العامة"
                : "Global Default Commission Rate"}
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
                {isRtl
                  ? "يمكن تجاوزها على مستوى الفئات أو الاتفاقيات الفردية مع الموردين"
                  : "Can be overridden per category or supplier agreement"}
              </small>
            </div>
          </label>
          <button
            className="primary-btn"
            style={{ width: "fit-content", marginTop: 12 }}
            onClick={handleSave}
          >
            {saved ? <CheckCircle2 size={14} /> : null}
            {saved
              ? isRtl
                ? "تم حفظ الإعدادات"
                : "Settings Saved"
              : isRtl
                ? "حفظ إعدادات المنصة"
                : "Save Platform Settings"}
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
            {isRtl
              ? "مفاتيح الميزات والمحرك المعياري"
              : "Feature Flags & Modular Engine"}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            {isRtl
              ? "تفعيل أو تعطيل وحدات المنصة ديناميكياً لهذه النسخة"
              : "Enable or disable modules dynamically for this deployment"}
          </p>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            {
              key: "wallet" as const,

              label: isRtl
                ? "المحفظة التجارية والدفتر المالي المزدوج"
                : "Merchant Wallet & Financial Ledger",

              desc: isRtl
                ? "السماح للتجار بإيداع الأموال والدفع المباشر من الأرصدة الداخلية"
                : "Allow buyers to deposit funds and pay using internal balances",
            },

            {
              key: "moq" as const,

              label: isRtl
                ? "محرك الحد الأدنى للطلب (MOQ)"
                : "Minimum Order Quantity (MOQ) Engine",

              desc: isRtl
                ? "فرض حدود الشراء الدنيا لتجارة الجملة ونموذج B2B"
                : "Enforce volume threshold purchasing for wholesale/B2B models",
            },

            {
              key: "chat" as const,

              label: isRtl
                ? "المراسلة الفورية بين التاجر والمورد"
                : "Buyer-Supplier Realtime Messaging",

              desc: isRtl
                ? "محادثات مباشرة داخل التطبيق مرتبطة بالطلبات الفرعية"
                : "Enable direct in-app conversations attached to suborders",
            },

            {
              key: "reviews" as const,

              label: isRtl
                ? "التقييمات والسمعة التجارية الموثقة"
                : "Verified Customer Reviews & Ratings",

              desc: isRtl
                ? "السماح للتجار الذين استلموا الطلب بنشر التقييمات"
                : "Allow buyers who completed delivery to post ratings",
            },

            {
              key: "multiWarehouse" as const,

              label: isRtl
                ? "إدارة المخزون في مستودعات متعددة"
                : "Multi-Warehouse Inventory Allocation",

              desc: isRtl
                ? "تمكين الموردين من إدارة مراكز توزيع وشحن متعددة"
                : "Allow vendors to manage multiple fulfillment hubs",
            },

            {
              key: "rfq" as const,

              label: isRtl
                ? "محرك عروض الأسعار المخصصة (RFQ)"
                : "RFQ & Custom Quotations Engine",

              desc: isRtl
                ? "السماح للشركات بطلب عروض أسعار تفاوضية للكميات الضخمة"
                : "Allow business buyers to request tailored bulk quotes",
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
