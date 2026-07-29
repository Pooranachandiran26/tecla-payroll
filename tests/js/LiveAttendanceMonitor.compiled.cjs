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

// resources/js/Pages/Payroll/LiveAttendanceMonitor.jsx
var LiveAttendanceMonitor_exports = {};
__export(LiveAttendanceMonitor_exports, {
  default: () => LiveAttendanceMonitor
});
module.exports = __toCommonJS(LiveAttendanceMonitor_exports);
var import_react = __toESM(require("react"), 1);
var import_AuthenticatedLayout = __toESM(require("../../Layouts/AuthenticatedLayout"), 1);
var import_react2 = require("@inertiajs/react");
var import_RoleGuard = __toESM(require("../../Components/RoleGuard.jsx"), 1);
var import_useToast = __toESM(require("../../Hooks/useToast"), 1);
var import_lucide_react = require("lucide-react");
function LiveAttendanceMonitor({ clients = [], punches = {}, selectedClientId, selectedDate }) {
  const { showToast } = (0, import_useToast.default)();
  const [isRefreshing, setIsRefreshing] = (0, import_react.useState)(false);
  const [clientId, setClientId] = (0, import_react.useState)(selectedClientId || "");
  const [date, setDate] = (0, import_react.useState)(selectedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
  const [search, setSearch] = (0, import_react.useState)("");
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 864e5).toISOString().split("T")[0];
  const isToday = date === todayStr;
  const clientsList = Array.isArray(clients) ? clients : [];
  const punchesObj = punches || {};
  const punchesList = Array.isArray(punchesObj) ? punchesObj : punchesObj.data || [];
  const punchesLinks = Array.isArray(punchesObj) ? [] : punchesObj.links || [];
  const punchesTotal = Array.isArray(punchesObj) ? punchesObj.length : punchesObj.total || 0;
  const punchesFrom = Array.isArray(punchesObj) ? punchesObj.length > 0 ? 1 : 0 : punchesObj.from || 0;
  const punchesTo = Array.isArray(punchesObj) ? punchesObj.length : punchesObj.to || 0;
  const applyFilters = (newClientId = clientId, newDate = date) => {
    import_react2.router.get(route("payroll.live-monitor"), {
      client_id: newClientId || void 0,
      date: newDate || void 0,
      search: search || void 0
    }, { preserveState: true, preserveScroll: true });
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };
  const handleClientChange = (e) => {
    const val = e.target.value;
    setClientId(val);
    applyFilters(val, date);
  };
  const handleDateChange = (newDate) => {
    setDate(newDate);
    applyFilters(clientId, newDate);
  };
  const handleRefresh = () => {
    setIsRefreshing(true);
    import_react2.router.reload({
      onFinish: () => {
        setIsRefreshing(false);
        showToast({
          type: "success",
          title: "Live Feeds Updated",
          message: "The attendance list has been successfully refreshed."
        });
      }
    });
  };
  const filteredPunches = punchesList.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q);
  });
  const presentCount = punchesList.filter((p) => p.status === "present").length;
  const absentCount = punchesList.filter((p) => p.status === "absent").length;
  const leaveCount = punchesList.filter((p) => p.status === "leave").length;
  const getSourceBadge = (source) => {
    const srcMap = {
      "live_punch": { icon: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Fingerprint, { size: 13 }), label: "Live Punch", badgeClass: "badge-success" },
      "uploaded": { icon: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.FileSpreadsheet, { size: 13 }), label: "Uploaded", badgeClass: "badge-info" },
      "override": { icon: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.PenLine, { size: 13 }), label: "Override", badgeClass: "badge-warning" },
      "leave": { icon: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Umbrella, { size: 13 }), label: "Leave", badgeClass: "badge-secondary" }
    };
    return srcMap[(source || "").toLowerCase()] || { icon: /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Clock, { size: 13 }), label: source || "Live Punch", badgeClass: "badge-secondary" };
  };
  return /* @__PURE__ */ import_react.default.createElement(import_RoleGuard.default, { allowedRoles: ["admin", "manager"] }, /* @__PURE__ */ import_react.default.createElement(import_AuthenticatedLayout.default, null, /* @__PURE__ */ import_react.default.createElement(import_react2.Head, { title: "Live Attendance Monitor" }), /* @__PURE__ */ import_react.default.createElement("div", { className: "legacy-react-wrapper" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-row-between" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h2", null, "Live Attendance Monitor"), /* @__PURE__ */ import_react.default.createElement("p", { style: { color: "var(--text-muted)", fontSize: "0.9rem" } }, isToday ? "Today's live punch feed \u2014 showing real-time clock-in status. Monthly totals for payroll are computed in Attendance Review." : `Punch feed for ${(/* @__PURE__ */ new Date(date + "T00:00:00")).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}. Monthly totals are computed in Attendance Review.`)), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: "0.75rem" } }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      onClick: handleRefresh,
      disabled: isRefreshing,
      className: "btn btn-secondary",
      style: { display: "inline-flex", alignItems: "center", gap: "6px" }
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.RefreshCw, { size: 14, className: isRefreshing ? "animate-spin" : "" }),
    " Refresh Feed"
  ), /* @__PURE__ */ import_react.default.createElement(
    import_react2.Link,
    {
      href: route("payroll.attendance-upload"),
      className: "btn btn-navy",
      style: { display: "inline-flex", alignItems: "center", gap: "6px" }
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Upload, { size: 14 }),
    " Upload Spreadsheet"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Filter, { size: 14 }), " Filters:"), /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: "1", minWidth: "200px" } }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      className: "form-control",
      placeholder: "Search by Employee Code or Name...",
      style: { padding: "0.4rem 0.75rem" },
      value: search,
      onChange: (e) => setSearch(e.target.value),
      onKeyPress: handleKeyPress
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      className: "form-control",
      style: { padding: "0.4rem 0.75rem" },
      value: clientId,
      onChange: handleClientChange
    },
    /* @__PURE__ */ import_react.default.createElement("option", { value: "" }, "All Client Partners"),
    clientsList.map((c) => /* @__PURE__ */ import_react.default.createElement("option", { key: c.id, value: c.id }, c.company_name))
  )), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "0.4rem" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Calendar, { size: 14, style: { color: "var(--text-muted)" } }), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "date",
      className: "form-control",
      style: { padding: "0.4rem 0.75rem" },
      value: date,
      onChange: (e) => handleDateChange(e.target.value)
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: "0.4rem" } }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleDateChange(todayStr),
      className: `btn ${date === todayStr ? "btn-navy" : "btn-secondary"}`,
      style: { padding: "0.4rem 0.75rem", fontSize: "0.8rem" }
    },
    "Today"
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleDateChange(yesterdayStr),
      className: `btn ${date === yesterdayStr ? "btn-navy" : "btn-secondary"}`,
      style: { padding: "0.4rem 0.75rem", fontSize: "0.8rem" }
    },
    "Yesterday"
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "btn btn-navy",
      style: { padding: "0.4rem 1rem", display: "inline-flex", alignItems: "center", gap: "5px" },
      onClick: () => applyFilters()
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Search, { size: 14 }),
    " Apply"
  )), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "1.25rem", fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--primary-navy)", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem" } }, "Source Legend:"), /* @__PURE__ */ import_react.default.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Fingerprint, { size: 14, style: { color: "#16a34a" } }), " Live Punch"), /* @__PURE__ */ import_react.default.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.FileSpreadsheet, { size: 14, style: { color: "#0284c7" } }), " Uploaded"), /* @__PURE__ */ import_react.default.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.PenLine, { size: 14, style: { color: "#ea580c" } }), " Override"), /* @__PURE__ */ import_react.default.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Umbrella, { size: 14, style: { color: "#64748b" } }), " Leave")), /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" } }, "Resets daily. Monthly totals calculate in Attendance Review.")), /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { padding: "0.75rem 1rem", marginBottom: "1.25rem", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.5rem" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.AlertTriangle, { size: 16, style: { color: "#d97706", flexShrink: 0 } }), /* @__PURE__ */ import_react.default.createElement("span", null, "If both a punch record and an uploaded timesheet exist for the same employee, the ", /* @__PURE__ */ import_react.default.createElement("strong", null, "live punch always wins"), " in payroll calculations.")), /* @__PURE__ */ import_react.default.createElement("div", { className: "card" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "table-responsive" }, /* @__PURE__ */ import_react.default.createElement("table", { className: "data-table" }, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("th", null, "Emp Code"), /* @__PURE__ */ import_react.default.createElement("th", null, "Employee Name"), /* @__PURE__ */ import_react.default.createElement("th", null, "Client Partner"), /* @__PURE__ */ import_react.default.createElement("th", null, "Source"), /* @__PURE__ */ import_react.default.createElement("th", null, "Shift Type"), /* @__PURE__ */ import_react.default.createElement("th", null, "Clock In"), /* @__PURE__ */ import_react.default.createElement("th", null, "Clock Out"), /* @__PURE__ */ import_react.default.createElement("th", null, "Hours Logged"), /* @__PURE__ */ import_react.default.createElement("th", null, "Status"), /* @__PURE__ */ import_react.default.createElement("th", null, "Override"))), /* @__PURE__ */ import_react.default.createElement("tbody", null, filteredPunches && filteredPunches.length > 0 ? filteredPunches.map((row, idx) => {
    const srcBadge = getSourceBadge(row.source);
    return /* @__PURE__ */ import_react.default.createElement("tr", { key: idx }, /* @__PURE__ */ import_react.default.createElement("td", { style: { fontWeight: "600", fontFamily: "monospace" } }, row.code), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("div", { style: { fontWeight: "600", color: "var(--primary-navy)" } }, row.name)), /* @__PURE__ */ import_react.default.createElement("td", null, row.clientName), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("span", { className: `badge ${srcBadge.badgeClass}`, style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, srcBadge.icon, " ", srcBadge.label)), /* @__PURE__ */ import_react.default.createElement("td", { style: { color: "var(--text-muted)", fontSize: "0.8rem" } }, row.shift || "\u2014"), /* @__PURE__ */ import_react.default.createElement("td", { style: { fontFamily: "monospace", fontWeight: "600" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Clock, { size: 12, style: { color: "#16a34a" } }), " ", row.in || "\u2014")), /* @__PURE__ */ import_react.default.createElement("td", { style: { fontFamily: "monospace", fontWeight: "600" } }, row.out === "working" ? /* @__PURE__ */ import_react.default.createElement("span", { className: "badge badge-warning" }, "Still Working") : /* @__PURE__ */ import_react.default.createElement("span", null, row.out || "\u2014")), /* @__PURE__ */ import_react.default.createElement("td", { style: { fontWeight: "700", fontFamily: "monospace" } }, row.hours || "\u2014"), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("span", { className: `badge badge-${row.status === "present" ? "success" : row.status === "leave" ? "warning" : "danger"}` }, row.status === "present" ? "Present" : row.status === "leave" ? "On Leave" : "Not Clocked In")), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: "btn btn-secondary btn-xs",
        disabled: true,
        style: { opacity: 0.6, cursor: "not-allowed", display: "inline-flex", alignItems: "center", gap: "4px" },
        title: "Biometric overrides are handled directly in the Employee Portal"
      },
      /* @__PURE__ */ import_react.default.createElement(import_lucide_react.SlidersHorizontal, { size: 12 }),
      " Disabled"
    )));
  }) : /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("td", { colSpan: "10", style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } }, "No punch records found for the selected date and filters."))))), punchesLinks && punchesLinks.length > 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "pagination-container" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "pagination-info" }, "Showing ", /* @__PURE__ */ import_react.default.createElement("strong", null, punchesFrom), " to ", /* @__PURE__ */ import_react.default.createElement("strong", null, punchesTo), " of ", /* @__PURE__ */ import_react.default.createElement("strong", null, punchesTotal), " punch records"), /* @__PURE__ */ import_react.default.createElement("ul", { className: "pagination" }, punchesLinks.map((link, idx) => /* @__PURE__ */ import_react.default.createElement("li", { key: idx, className: `page-item ${link.active ? "active" : ""} ${!link.url ? "disabled" : ""}` }, /* @__PURE__ */ import_react.default.createElement(import_react2.Link, { className: "page-link", href: link.url || "#", dangerouslySetInnerHTML: { __html: link.label } })))))), /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { padding: "1rem 1.25rem", marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.85rem", fontWeight: 600 } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--primary-navy)", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem" } }, "Daily Summary:"), /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "#15803d", display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.CheckCircle2, { size: 14 }), " ", presentCount, " Present"), /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "#b91c1c", display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.XCircle, { size: 14 }), " ", absentCount, " Not Clocked In"), /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "#b45309", display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Umbrella, { size: 14 }), " ", leaveCount, " On Leave")), /* @__PURE__ */ import_react.default.createElement(import_react2.Link, { href: route("payroll.attendance-review"), className: "btn btn-navy", style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, "Attendance Review ", /* @__PURE__ */ import_react.default.createElement(import_lucide_react.ArrowRight, { size: 14 }))))));
}
