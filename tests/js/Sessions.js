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

// resources/js/Pages/Admin/Sessions.jsx
var Sessions_exports = {};
__export(Sessions_exports, {
  default: () => AdminSessions
});
module.exports = __toCommonJS(Sessions_exports);
var import_react = require("@inertiajs/react");
var import_react2 = require("react");
var import_AuthenticatedLayout = __toESM(require("../../Layouts/AuthenticatedLayout"), 1);
var import_RoleGuard = __toESM(require("../../Components/RoleGuard.jsx"), 1);
var import_lucide_react = require("lucide-react");
function AdminSessions({ sessions = {}, filters = {} }) {
  const [selected, setSelected] = (0, import_react2.useState)([]);
  const [search, setSearch] = (0, import_react2.useState)(filters.search || "");
  const data = sessions.data || [];
  const total = sessions.total || 0;
  const fromIdx = sessions.from || 0;
  const toIdx = sessions.to || 0;
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    import_react.router.get(route("admin.sessions"), { search, page: 1 }, { preserveState: true });
  };
  const revokeSelected = () => {
    if (selected.length === 0) return;
    if (confirm(`Are you sure you want to revoke ${selected.length} session(s)?`)) {
      import_react.router.post(route("admin.sessions.bulk-revoke"), { ids: selected }, {
        onSuccess: () => setSelected([])
      });
    }
  };
  const allChecked = selected.length === data.length && data.length > 0;
  return /* @__PURE__ */ React.createElement(import_RoleGuard.default, { allowedRoles: ["admin"] }, /* @__PURE__ */ React.createElement(import_AuthenticatedLayout.default, null, /* @__PURE__ */ React.createElement(import_react.Head, { title: "Active Sessions" }), /* @__PURE__ */ React.createElement("div", { className: "legacy-react-wrapper" }, /* @__PURE__ */ React.createElement("div", { className: "flex-row-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, "Active Sessions"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--text-muted)", fontSize: "0.9rem" } }, "Monitor and manage all active user sessions across the system. Revoke any suspicious session instantly.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "0.75rem" } }, selected.length > 0 && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: revokeSelected,
      className: "btn btn-danger",
      style: { display: "inline-flex", alignItems: "center", gap: "6px" }
    },
    /* @__PURE__ */ React.createElement(import_lucide_react.ShieldAlert, { size: 14 }),
    " Revoke ",
    selected.length,
    " Selected"
  ))), /* @__PURE__ */ React.createElement("div", { className: "card", style: { padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(import_lucide_react.Filter, { size: 14 }), " Search Sessions:"), /* @__PURE__ */ React.createElement("div", { style: { flex: "1", minWidth: "250px" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      className: "form-control",
      placeholder: "Search by User Name, Email or IP Address...",
      style: { padding: "0.4rem 0.75rem" },
      value: search,
      onChange: (e) => setSearch(e.target.value),
      onKeyPress: (e) => e.key === "Enter" && handleSearch(e)
    }
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "btn btn-navy",
      style: { padding: "0.4rem 1rem", display: "inline-flex", alignItems: "center", gap: "5px" },
      onClick: handleSearch
    },
    /* @__PURE__ */ React.createElement(import_lucide_react.Search, { size: 14 }),
    " Search"
  )), /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "table-responsive" }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { width: "40px" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: allChecked,
      onChange: (e) => setSelected(e.target.checked ? data.map((s) => s.id) : [])
    }
  )), /* @__PURE__ */ React.createElement("th", null, "User Account"), /* @__PURE__ */ React.createElement("th", null, "IP Address"), /* @__PURE__ */ React.createElement("th", null, "Device & Platform"), /* @__PURE__ */ React.createElement("th", null, "Last Active"), /* @__PURE__ */ React.createElement("th", null, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, data && data.length > 0 ? data.map((row) => /* @__PURE__ */ React.createElement("tr", { key: row.id }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      checked: selected.includes(row.id),
      onChange: (e) => {
        if (e.target.checked) setSelected([...selected, row.id]);
        else setSelected(selected.filter((id) => id !== row.id));
      }
    }
  )), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "600", color: "var(--primary-navy)" } }, row.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.75rem", color: "var(--text-muted)" } }, row.email)), /* @__PURE__ */ React.createElement("td", { style: { fontFamily: "monospace", fontWeight: "600" } }, /* @__PURE__ */ React.createElement("span", { className: "badge badge-info", style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(import_lucide_react.Globe, { size: 12 }), " ", row.ip_address)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 600, color: "#334155" } }, /* @__PURE__ */ React.createElement(import_lucide_react.Monitor, { size: 14, style: { color: "var(--text-muted)" } }), row.browser, " on ", row.platform)), /* @__PURE__ */ React.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.8rem", color: "#475569" } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(import_lucide_react.Clock, { size: 12, style: { color: "var(--text-muted)" } }), " ", row.last_active)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "btn btn-danger btn-xs",
      style: { display: "inline-flex", alignItems: "center", gap: "4px" },
      onClick: () => {
        if (confirm("Revoke this session?")) {
          import_react.router.delete(route("admin.sessions.destroy", row.id));
        }
      }
    },
    /* @__PURE__ */ React.createElement(import_lucide_react.ShieldX, { size: 12 }),
    " Revoke"
  )))) : /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "6", style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } }, "No active session records found matching the search query."))))), /* @__PURE__ */ React.createElement("div", { className: "pagination-container" }, /* @__PURE__ */ React.createElement("div", { className: "pagination-info" }, "Showing ", /* @__PURE__ */ React.createElement("strong", null, fromIdx), " to ", /* @__PURE__ */ React.createElement("strong", null, toIdx), " of ", /* @__PURE__ */ React.createElement("strong", null, total), " active sessions"), /* @__PURE__ */ React.createElement("ul", { className: "pagination" }, sessions.links?.map((link, idx) => /* @__PURE__ */ React.createElement("li", { key: idx, className: `page-item ${link.active ? "active" : ""} ${!link.url ? "disabled" : ""}` }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "page-link",
      onClick: () => {
        if (link.url) {
          const urlObj = new URL(link.url);
          const pageVal = urlObj.searchParams.get("page");
          import_react.router.get(route("admin.sessions"), { search, page: pageVal }, { preserveState: true, preserveScroll: true });
        }
      },
      dangerouslySetInnerHTML: { __html: link.label }
    }
  )))))))));
}
