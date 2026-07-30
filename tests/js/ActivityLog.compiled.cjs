var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// resources/js/Pages/Admin/ActivityLog.jsx
var ActivityLog_exports = {};
__export(ActivityLog_exports, {
  default: () => ActivityLog
});
module.exports = __toCommonJS(ActivityLog_exports);
var import_react = __toESM(require("react"), 1);
var import_AuthenticatedLayout = __toESM(require("../../Layouts/AuthenticatedLayout"), 1);
var import_react2 = require("@inertiajs/react");
var import_RoleGuard = __toESM(require("../../Components/RoleGuard.jsx"), 1);
var import_lucide_react = require("lucide-react");
var CATEGORIES = [
  { id: "all", label: "All Activity", icon: import_lucide_react.Layers },
  { id: "security", label: "Security", icon: import_lucide_react.ShieldAlert },
  { id: "auth", label: "Authentication", icon: import_lucide_react.Key },
  { id: "employee", label: "Employee", icon: import_lucide_react.Users },
  { id: "payroll", label: "Payroll", icon: import_lucide_react.FileText },
  { id: "settings", label: "Settings", icon: import_lucide_react.Sliders },
  { id: "usermgt", label: "User Mgt", icon: import_lucide_react.UserCheck },
  { id: "system", label: "System", icon: import_lucide_react.Cpu }
];
var CAT_MATCHERS = {
  security: (a) => /login_failed|lock|breach|inactive_access|session_revoked/.test(a),
  auth: (a) => /^login$|^logout$|otp|password_reset|invitation_accepted/.test(a),
  employee: (a) => /employee\.|employee_|auto_activated|salary_revision|document_verified|document_rejected|bank_change/.test(a),
  payroll: (a) => /payroll|payslip|pf_|esi_|tds_|lop/.test(a),
  settings: (a) => /settings|branding|company_profile|pt_slab|lwf_slab|gst|localization|file_upload|email\.settings/.test(a),
  usermgt: (a) => /user_created|invitation|role_changed|user_suspended|user_reactivated/.test(a),
  system: (a) => /email\.test|email\.send|export|bulk_upload/.test(a)
};
function getCatBadge(action) {
  const a = (action || "").toLowerCase();
  if (CAT_MATCHERS.security(a)) return { label: "Security", badgeClass: "badge-danger" };
  if (CAT_MATCHERS.auth(a)) return { label: "Authentication", badgeClass: "badge-info" };
  if (CAT_MATCHERS.employee(a)) return { label: "Employee", badgeClass: "badge-success" };
  if (CAT_MATCHERS.payroll(a)) return { label: "Payroll", badgeClass: "badge-warning" };
  if (CAT_MATCHERS.settings(a)) return { label: "Settings", badgeClass: "badge-secondary" };
  if (CAT_MATCHERS.usermgt(a)) return { label: "User Mgt", badgeClass: "badge-gold" };
  return { label: "System", badgeClass: "badge-navy" };
}
var ACTION_LABELS = {
  "login": "Logged In",
  "logout": "Logged Out",
  "login_failed": "Login Failed",
  "account_locked": "Account Locked",
  "inactive_access_revoked": "Inactive Access Revoked",
  "otp.send_failed": "OTP Send Failed",
  "password_reset": "Password Reset",
  "invitation_created": "Invitation Sent",
  "invitation_accepted": "Invitation Accepted",
  "invitation.send_failed": "Invitation Send Failed",
  "branding_updated": "Branding Updated",
  "company_profile_updated": "Company Profile Updated",
  "pt_slab_updated": "PT Slab Updated",
  "lwf_slab_updated": "LWF Slab Updated",
  "payroll_settings_updated": "Payroll Settings Updated",
  "settings_updated": "Settings Updated",
  "email.settings_updated": "Email Settings Updated",
  "email.test_sent": "Test Email Sent",
  "email.test_failed": "Test Email Failed",
  "settings.localization_updated": "Localization Updated",
  "settings.gst_updated": "GST Settings Updated",
  "employee.auto_activated": "Employee Auto-Activated",
  "employee.suspended": "Employee Suspended",
  "employee.reactivated": "Employee Reactivated",
  "employee.deleted": "Employee Deleted",
  "employee.exit_initiated": "Exit Initiated",
  "session_revoked": "Session Revoked",
  "export.employee_data": "Employee Data Exported",
  "payroll.approved": "Payroll Run Approved",
  "payroll.locked": "Payroll Run Locked",
  "leave.approved": "Leave Request Approved",
  "bank_change.approved": "Bank Change Approved"
};
function getLabel(action) {
  return ACTION_LABELS[action] || (action || "").replace(/_/g, " ").replace(/\./g, " \u203A ");
}
function DiffPanel({ log }) {
  const { old_values: ov, new_values: nv, metadata } = log;
  const changedKeys = (0, import_react.useMemo)(() => {
    const keys = Array.from(/* @__PURE__ */ new Set([...Object.keys(ov || {}), ...Object.keys(nv || {})]));
    return keys.filter((k) => JSON.stringify((ov || {})[k]) !== JSON.stringify((nv || {})[k]));
  }, [ov, nv]);
  if (!ov && !nv && !metadata) return /* @__PURE__ */ import_react.default.createElement("tr", { className: "diff-row" }, /* @__PURE__ */ import_react.default.createElement("td", { colSpan: 7, style: { padding: "0.75rem 1.5rem", background: "#f8fafc" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" } }, "No additional details recorded for this event.")));
  return /* @__PURE__ */ import_react.default.createElement("tr", { className: "diff-row" }, /* @__PURE__ */ import_react.default.createElement("td", { colSpan: 7, style: { padding: "1rem 1.5rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" } }, changedKeys.length > 0 && /* @__PURE__ */ import_react.default.createElement("div", { style: { marginBottom: metadata ? "0.75rem" : 0 } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-navy)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" } }, "Field Changes (", changedKeys.length, " field", changedKeys.length > 1 ? "s" : "", " modified)"), /* @__PURE__ */ import_react.default.createElement("table", { className: "data-table", style: { width: "100%", maxWidth: "750px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px" } }, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("th", { style: { padding: "0.4rem 0.75rem", textAlign: "left", width: "30%" } }, "Field"), /* @__PURE__ */ import_react.default.createElement("th", { style: { padding: "0.4rem 0.75rem", textAlign: "left", color: "#dc2626" } }, "Before"), /* @__PURE__ */ import_react.default.createElement("th", { style: { padding: "0.4rem 0.75rem", textAlign: "left", color: "#16a34a" } }, "After"))), /* @__PURE__ */ import_react.default.createElement("tbody", null, changedKeys.map((k) => {
    const oldV = (ov || {})[k];
    const newV = (nv || {})[k];
    return /* @__PURE__ */ import_react.default.createElement("tr", { key: k }, /* @__PURE__ */ import_react.default.createElement("td", { style: { padding: "0.4rem 0.75rem", fontFamily: "monospace", fontWeight: 600 } }, k), /* @__PURE__ */ import_react.default.createElement("td", { style: { padding: "0.4rem 0.75rem", background: "#fef2f2", color: "#dc2626" } }, /* @__PURE__ */ import_react.default.createElement("s", null, oldV == null ? "\u2014" : String(oldV))), /* @__PURE__ */ import_react.default.createElement("td", { style: { padding: "0.4rem 0.75rem", background: "#f0fdf4", color: "#16a34a", fontWeight: 600 } }, newV == null ? "\u2014" : String(newV)));
  })))), metadata && Object.keys(metadata).length > 0 && /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-navy)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" } }, "Additional Context"), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "0.5rem" } }, Object.entries(metadata).map(([k, v]) => /* @__PURE__ */ import_react.default.createElement("span", { key: k, style: { display: "inline-flex", gap: "0.35rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "0.25rem 0.6rem", fontSize: "0.8rem" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--text-muted)", fontWeight: 600 } }, k, ":"), /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "#1e293b", fontFamily: "monospace" } }, typeof v === "object" ? JSON.stringify(v) : String(v ?? "\u2014"))))))));
}
function ActivityLog({ logs, categoryCounts = {}, filters: sf }) {
  const activeTab = sf?.category || "all";
  const [search, setSearch] = (0, import_react.useState)(sf?.search || "");
  const [dateFrom, setDateFrom] = (0, import_react.useState)(sf?.date_from || "");
  const [dateTo, setDateTo] = (0, import_react.useState)(sf?.date_to || "");
  const [expanded, setExpanded] = (0, import_react.useState)(null);
  const applyFilters = (newCategory = activeTab) => {
    import_react2.router.get(route("admin.activity-log"), {
      search: search || void 0,
      date_from: dateFrom || void 0,
      date_to: dateTo || void 0,
      category: newCategory === "all" ? void 0 : newCategory
    }, { preserveState: true, preserveScroll: true });
  };
  const handleTabClick = (catId) => {
    applyFilters(catId);
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };
  const resetFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    import_react2.router.get(route("admin.activity-log"), {}, { preserveState: true, preserveScroll: true });
  };
  const displayedLogs = logs?.data || [];
  const exportCsvUrl = route("admin.activity-log", {
    search: search || void 0,
    date_from: dateFrom || void 0,
    date_to: dateTo || void 0,
    category: activeTab === "all" ? void 0 : activeTab,
    export: "csv"
  });
  return /* @__PURE__ */ import_react.default.createElement(import_RoleGuard.default, { allowedRoles: ["admin"] }, /* @__PURE__ */ import_react.default.createElement(import_AuthenticatedLayout.default, null, /* @__PURE__ */ import_react.default.createElement(import_react2.Head, { title: "Activity Log" }), /* @__PURE__ */ import_react.default.createElement("div", { className: "legacy-react-wrapper" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-row-between" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h2", null, "Activity Log"), /* @__PURE__ */ import_react.default.createElement("p", { style: { color: "var(--text-muted)", fontSize: "0.9rem" } }, "Full audit trail of all system events \u2014 logins, employee changes, payroll actions, settings, and more.")), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: "0.75rem" } }, /* @__PURE__ */ import_react.default.createElement(
    "a",
    {
      href: exportCsvUrl,
      className: "btn btn-secondary",
      style: { display: "inline-flex", alignItems: "center", gap: "6px" }
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Download, { size: 15 }),
    " Export CSV"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { padding: "1rem", marginBottom: "1.25rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Filter, { size: 14 }), " Filters:"), /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: "1", minWidth: "220px" } }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      className: "form-control",
      placeholder: "Search by User, Action, or IP...",
      style: { padding: "0.4rem 0.75rem" },
      value: search,
      onChange: (e) => setSearch(e.target.value),
      onKeyPress: handleKeyPress
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "0.4rem" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 } }, "From:"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "date",
      className: "form-control",
      style: { padding: "0.4rem 0.75rem" },
      value: dateFrom,
      onChange: (e) => setDateFrom(e.target.value)
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "0.4rem" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 } }, "To:"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "date",
      className: "form-control",
      style: { padding: "0.4rem 0.75rem" },
      value: dateTo,
      onChange: (e) => setDateTo(e.target.value)
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "btn btn-navy",
      style: { padding: "0.4rem 1rem", display: "inline-flex", alignItems: "center", gap: "5px" },
      onClick: () => applyFilters()
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Search, { size: 14 }),
    " Apply"
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "btn btn-secondary",
      style: { padding: "0.4rem 1rem", display: "inline-flex", alignItems: "center", gap: "5px" },
      onClick: resetFilters
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.RotateCcw, { size: 14 }),
    " Reset"
  )), /* @__PURE__ */ import_react.default.createElement("div", { style: {
    background: "#F1F5F9",
    borderRadius: "12px",
    padding: "5px",
    marginBottom: "1.25rem",
    display: "flex",
    gap: "4px",
    overflowX: "auto",
    alignItems: "center",
    border: "1px solid #E2E8F0"
  } }, CATEGORIES.map((cat) => {
    const isActive = activeTab === cat.id;
    const IconComponent = cat.icon;
    const count = categoryCounts[cat.id] !== void 0 ? categoryCounts[cat.id] : 0;
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        key: cat.id,
        type: "button",
        onClick: () => handleTabClick(cat.id),
        style: {
          padding: "0.45rem 0.85rem",
          fontSize: "0.82rem",
          fontWeight: isActive ? "700" : "600",
          color: isActive ? "var(--primary-navy)" : "#64748B",
          background: isActive ? "#FFFFFF" : "transparent",
          boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.15s ease"
        }
      },
      /* @__PURE__ */ import_react.default.createElement(IconComponent, { size: 14, style: { color: isActive ? "var(--primary-navy)" : "#94A3B8" } }),
      /* @__PURE__ */ import_react.default.createElement("span", null, cat.label),
      /* @__PURE__ */ import_react.default.createElement("span", { style: {
        padding: "0.1rem 0.45rem",
        borderRadius: "9999px",
        fontSize: "0.7rem",
        fontWeight: "700",
        background: isActive ? "var(--primary-navy)" : "#E2E8F0",
        color: isActive ? "#FFFFFF" : "#475569"
      } }, count)
    );
  })), /* @__PURE__ */ import_react.default.createElement("div", { className: "card" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "table-responsive" }, /* @__PURE__ */ import_react.default.createElement("table", { className: "data-table" }, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("th", null, "User Account"), /* @__PURE__ */ import_react.default.createElement("th", null, "Category"), /* @__PURE__ */ import_react.default.createElement("th", null, "Action Description"), /* @__PURE__ */ import_react.default.createElement("th", null, "Target / Scope"), /* @__PURE__ */ import_react.default.createElement("th", null, "IP Address"), /* @__PURE__ */ import_react.default.createElement("th", null, "Timestamp"), /* @__PURE__ */ import_react.default.createElement("th", null, "Actions"))), /* @__PURE__ */ import_react.default.createElement("tbody", null, displayedLogs && displayedLogs.length > 0 ? displayedLogs.map((log) => {
    const isExp = expanded === log.id;
    const catBadge = getCatBadge(log.action);
    const hasDiff = !!(log.old_values || log.new_values || log.metadata);
    const userName = log.user ? log.user.name : log.user_name || "System";
    const userEmail = log.user ? log.user.email : log.user_email || "\u2014";
    const initials = userName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "S";
    return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, { key: log.id }, /* @__PURE__ */ import_react.default.createElement("tr", { style: { background: isExp ? "#f8fafc" : "transparent" } }, /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "0.6rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      background: "var(--primary-navy)",
      color: "#fff",
      fontSize: "0.75rem",
      fontWeight: "700",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    } }, initials), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: "600", color: "var(--primary-navy)" } }, userName), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.75rem", color: "var(--text-muted)" } }, userEmail)))), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("span", { className: `badge ${catBadge.badgeClass}` }, catBadge.label)), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: "600", color: "#1e293b" } }, getLabel(log.action)), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" } }, log.action)), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.85rem", fontWeight: "600", color: "#334155" } }, log.auditable_type ? log.auditable_type.split("\\").pop() : "Global"), log.auditable_id && /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" } }, "#", log.auditable_id)), /* @__PURE__ */ import_react.default.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.8rem", color: "#475569" } }, log.ip_address || "\u2014"), /* @__PURE__ */ import_react.default.createElement("td", { style: { whiteSpace: "nowrap", fontSize: "0.8rem", color: "#475569" } }, log.created_at ? new Date(log.created_at).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }) : "\u2014"), /* @__PURE__ */ import_react.default.createElement("td", { style: { whiteSpace: "nowrap" } }, hasDiff ? /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        type: "button",
        className: `btn ${isExp ? "btn-navy" : "btn-secondary"} btn-xs`,
        style: { display: "inline-flex", alignItems: "center", gap: "4px" },
        onClick: () => setExpanded(isExp ? null : log.id)
      },
      /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Eye, { size: 13 }),
      " ",
      isExp ? "Hide Details" : "View Details"
    ) : /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" } }, "\u2014"))), isExp && /* @__PURE__ */ import_react.default.createElement(DiffPanel, { log }));
  }) : /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("td", { colSpan: "7", style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } }, "No activity log records found matching the selected filters."))))), /* @__PURE__ */ import_react.default.createElement("div", { className: "pagination-container" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "pagination-info" }, "Showing ", /* @__PURE__ */ import_react.default.createElement("strong", null, logs?.from || 0), " to ", /* @__PURE__ */ import_react.default.createElement("strong", null, logs?.to || 0), " of ", /* @__PURE__ */ import_react.default.createElement("strong", null, logs?.total || 0), " log records"), /* @__PURE__ */ import_react.default.createElement("ul", { className: "pagination" }, logs?.links?.map((link, idx) => /* @__PURE__ */ import_react.default.createElement("li", { key: idx, className: `page-item ${link.active ? "active" : ""} ${!link.url ? "disabled" : ""}` }, /* @__PURE__ */ import_react.default.createElement(import_react2.Link, { className: "page-link", href: link.url || "#", dangerouslySetInnerHTML: { __html: link.label } })))))))));
}
