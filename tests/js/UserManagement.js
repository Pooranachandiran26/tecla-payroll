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

// resources/js/Pages/Admin/UserManagement.jsx
var UserManagement_exports = {};
__export(UserManagement_exports, {
  default: () => UserManagement
});
module.exports = __toCommonJS(UserManagement_exports);
var import_react = require("@inertiajs/react");
var import_react2 = require("react");
var import_AuthenticatedLayout = __toESM(require("../../Layouts/AuthenticatedLayout"), 1);
var import_RoleGuard = __toESM(require("../../Components/RoleGuard.jsx"), 1);
var import_Modal = __toESM(require("../../Components/ui/Modal"), 1);
var import_lucide_react = require("lucide-react");
function UserManagement({ users = {}, unlinkedEmployees = [], unlinkedClients = [], allClients = [], filters = {} }) {
  const [showInviteModal, setShowInviteModal] = (0, import_react2.useState)(false);
  const [editingManager, setEditingManager] = (0, import_react2.useState)(null);
  const [editClientIds, setEditClientIds] = (0, import_react2.useState)([]);
  const { tab = "system", search = "" } = filters;
  const [searchQuery, setSearchQuery] = (0, import_react2.useState)(search);
  const handleTabChange = (newTab) => {
    import_react.router.get(route("admin.users"), { tab: newTab, search: searchQuery }, { preserveState: true, preserveScroll: true });
  };
  const handleSearch = () => {
    import_react.router.get(route("admin.users"), { tab, search: searchQuery }, { preserveState: true, preserveScroll: true });
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  const { data, setData, post, processing, errors, reset } = (0, import_react.useForm)({
    name: "",
    email: "",
    role: "employee",
    employee_id: "",
    client_id: "",
    assigned_client_ids: []
  });
  const submit = (e) => {
    e.preventDefault();
    post(route("admin.users.store"), {
      onSuccess: () => {
        setShowInviteModal(false);
        reset();
      }
    });
  };
  const handleClientToggle = (clientId) => {
    const current = data.assigned_client_ids || [];
    if (current.includes(clientId)) {
      setData("assigned_client_ids", current.filter((id) => id !== clientId));
    } else {
      setData("assigned_client_ids", [...current, clientId]);
    }
  };
  const handleSaveManagerClients = (e) => {
    e.preventDefault();
    if (!editingManager) return;
    import_react.router.put(route("admin.users.update-managed-clients", editingManager.id), {
      assigned_client_ids: editClientIds
    }, {
      onSuccess: () => {
        setEditingManager(null);
        setEditClientIds([]);
      }
    });
  };
  const openManagerEditModal = (user) => {
    setEditingManager(user);
    const existingIds = (user.managed_clients || []).map((c) => c.id);
    setEditClientIds(existingIds);
  };
  const usersList = users.data || [];
  return /* @__PURE__ */ React.createElement(import_RoleGuard.default, { allowedRoles: ["admin"] }, /* @__PURE__ */ React.createElement(import_AuthenticatedLayout.default, null, /* @__PURE__ */ React.createElement(import_react.Head, { title: "User Management" }), /* @__PURE__ */ React.createElement("div", { className: "legacy-react-wrapper" }, /* @__PURE__ */ React.createElement("div", { className: "flex-row-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, "User Management"), /* @__PURE__ */ React.createElement("p", { style: { color: "var(--text-muted)", fontSize: "0.9rem" } }, "Manage user accounts, system roles, and client-level access control.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "0.75rem" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "btn btn-navy",
      onClick: () => setShowInviteModal(true),
      style: { display: "inline-flex", alignItems: "center", gap: "6px" }
    },
    /* @__PURE__ */ React.createElement(import_lucide_react.UserPlus, { size: 15 }),
    " Invite User"
  ))), /* @__PURE__ */ React.createElement("div", { style: {
    background: "#F1F5F9",
    borderRadius: "12px",
    padding: "5px",
    marginBottom: "1.25rem",
    display: "flex",
    gap: "4px",
    overflowX: "auto",
    alignItems: "center",
    border: "1px solid #E2E8F0"
  } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleTabChange("system"),
      style: {
        padding: "0.45rem 0.85rem",
        fontSize: "0.82rem",
        fontWeight: tab === "system" ? "700" : "600",
        color: tab === "system" ? "var(--primary-navy)" : "#64748B",
        background: tab === "system" ? "#FFFFFF" : "transparent",
        boxShadow: tab === "system" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
    /* @__PURE__ */ React.createElement(import_lucide_react.Shield, { size: 14, style: { color: tab === "system" ? "var(--primary-navy)" : "#94A3B8" } }),
    /* @__PURE__ */ React.createElement("span", null, "System Staff (Admins & Managers)")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleTabChange("clients"),
      style: {
        padding: "0.45rem 0.85rem",
        fontSize: "0.82rem",
        fontWeight: tab === "clients" ? "700" : "600",
        color: tab === "clients" ? "var(--primary-navy)" : "#64748B",
        background: tab === "clients" ? "#FFFFFF" : "transparent",
        boxShadow: tab === "clients" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
    /* @__PURE__ */ React.createElement(import_lucide_react.Building2, { size: 14, style: { color: tab === "clients" ? "var(--primary-navy)" : "#94A3B8" } }),
    /* @__PURE__ */ React.createElement("span", null, "Client Partners")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleTabChange("employees"),
      style: {
        padding: "0.45rem 0.85rem",
        fontSize: "0.82rem",
        fontWeight: tab === "employees" ? "700" : "600",
        color: tab === "employees" ? "var(--primary-navy)" : "#64748B",
        background: tab === "employees" ? "#FFFFFF" : "transparent",
        boxShadow: tab === "employees" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
    /* @__PURE__ */ React.createElement(import_lucide_react.Users, { size: 14, style: { color: tab === "employees" ? "var(--primary-navy)" : "#94A3B8" } }),
    /* @__PURE__ */ React.createElement("span", null, "Employees")
  )), /* @__PURE__ */ React.createElement("div", { className: "card", style: { padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)", display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(import_lucide_react.Filter, { size: 14 }), " Search Users:"), /* @__PURE__ */ React.createElement("div", { style: { flex: "1", minWidth: "250px" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      className: "form-control",
      placeholder: "Search by User Name or Email...",
      style: { padding: "0.4rem 0.75rem" },
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      onKeyPress: handleKeyPress
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
  )), /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "table-responsive" }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "User Account"), /* @__PURE__ */ React.createElement("th", null, "Email Address"), /* @__PURE__ */ React.createElement("th", null, "Role"), /* @__PURE__ */ React.createElement("th", null, "Status"), tab === "employees" && /* @__PURE__ */ React.createElement("th", null, "Client Partner"), tab === "clients" && /* @__PURE__ */ React.createElement("th", null, "Company"), tab === "system" && /* @__PURE__ */ React.createElement("th", null, "Assigned Scope / Access"))), /* @__PURE__ */ React.createElement("tbody", null, usersList && usersList.length > 0 ? usersList.map((row) => /* @__PURE__ */ React.createElement("tr", { key: row.id }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: "600", color: "var(--primary-navy)" } }, row.name)), /* @__PURE__ */ React.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.8rem", color: "#475569" } }, row.email), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: `badge ${row.role === "admin" ? "badge-navy" : row.role === "manager" ? "badge-info" : "badge-secondary"}` }, row.role)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: `badge badge-${row.status === "active" ? "success" : row.status === "locked" ? "danger" : "warning"}` }, row.status)), tab === "employees" && /* @__PURE__ */ React.createElement("td", null, row.employee?.client?.company_name || "\u2014"), tab === "clients" && /* @__PURE__ */ React.createElement("td", null, row.client?.company_name || "\u2014"), tab === "system" && /* @__PURE__ */ React.createElement("td", null, row.role === "admin" ? /* @__PURE__ */ React.createElement("span", { className: "badge badge-success", style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(import_lucide_react.CheckCircle2, { size: 12 }), " Full System Admin Access") : row.role === "manager" ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem" } }, (row.managed_clients || []).length > 0 ? (row.managed_clients || []).map((c) => /* @__PURE__ */ React.createElement("span", { key: c.id, className: "badge badge-info" }, "\u{1F3E2} ", c.company_name)) : /* @__PURE__ */ React.createElement("span", { className: "badge badge-warning", style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, /* @__PURE__ */ React.createElement(import_lucide_react.AlertTriangle, { size: 12 }), " No clients assigned"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "btn btn-secondary btn-xs",
      onClick: () => openManagerEditModal(row),
      style: { display: "inline-flex", alignItems: "center", gap: "3px" }
    },
    /* @__PURE__ */ React.createElement(import_lucide_react.Edit2, { size: 11 }),
    " Edit Scope"
  )) : "\u2014"))) : /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: tab === "system" ? 5 : 5, style: { textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" } }, "No user records found matching the search criteria."))))), /* @__PURE__ */ React.createElement("div", { className: "pagination-container" }, /* @__PURE__ */ React.createElement("div", { className: "pagination-info" }, "Showing ", /* @__PURE__ */ React.createElement("strong", null, users.from || 0), " to ", /* @__PURE__ */ React.createElement("strong", null, users.to || 0), " of ", /* @__PURE__ */ React.createElement("strong", null, users.total || 0), " user accounts"), /* @__PURE__ */ React.createElement("ul", { className: "pagination" }, users.links?.map((link, idx) => /* @__PURE__ */ React.createElement("li", { key: idx, className: `page-item ${link.active ? "active" : ""} ${!link.url ? "disabled" : ""}` }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "page-link",
      onClick: () => {
        if (link.url) {
          const urlObj = new URL(link.url);
          const pageVal = urlObj.searchParams.get("page");
          import_react.router.get(route("admin.users"), { tab, search, page: pageVal }, { preserveState: true, preserveScroll: true });
        }
      },
      dangerouslySetInnerHTML: { __html: link.label }
    }
  ))))))), /* @__PURE__ */ React.createElement(import_Modal.default, { isOpen: showInviteModal, onClose: () => setShowInviteModal(false), title: "Invite New User" }, /* @__PURE__ */ React.createElement("form", { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: "1rem" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" } }, "Name"), /* @__PURE__ */ React.createElement("input", { className: "form-control", value: data.name, onChange: (e) => setData("name", e.target.value), required: true }), errors.name && /* @__PURE__ */ React.createElement("div", { style: { color: "#dc2626", fontSize: "0.75rem", marginTop: "2px" } }, errors.name)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" } }, "Email"), /* @__PURE__ */ React.createElement("input", { type: "email", className: "form-control", value: data.email, onChange: (e) => setData("email", e.target.value), required: true }), errors.email && /* @__PURE__ */ React.createElement("div", { style: { color: "#dc2626", fontSize: "0.75rem", marginTop: "2px" } }, errors.email)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" } }, "Role"), /* @__PURE__ */ React.createElement("select", { className: "form-control", value: data.role, onChange: (e) => setData("role", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "employee" }, "Employee"), /* @__PURE__ */ React.createElement("option", { value: "client" }, "Client Partner"), /* @__PURE__ */ React.createElement("option", { value: "manager" }, "Manager"), /* @__PURE__ */ React.createElement("option", { value: "admin" }, "Admin"))), data.role === "employee" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" } }, "Link to Employee Profile *"), /* @__PURE__ */ React.createElement("select", { className: "form-control", value: data.employee_id, onChange: (e) => setData("employee_id", e.target.value), required: true }, /* @__PURE__ */ React.createElement("option", { value: "" }, "-- Select Employee --"), unlinkedEmployees.map((emp) => /* @__PURE__ */ React.createElement("option", { key: emp.id, value: emp.id }, emp.full_name, " (", emp.code, ")")))), data.role === "client" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "4px" } }, "Link to Client Company *"), /* @__PURE__ */ React.createElement("select", { className: "form-control", value: data.client_id, onChange: (e) => setData("client_id", e.target.value), required: true }, /* @__PURE__ */ React.createElement("option", { value: "" }, "-- Select Client --"), unlinkedClients.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.company_name)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" } }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowInviteModal(false) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-navy", disabled: processing }, "Submit Invitation")))), /* @__PURE__ */ React.createElement(import_Modal.default, { isOpen: !!editingManager, onClose: () => setEditingManager(null), title: `Edit Client Scope: ${editingManager?.name || ""}` }, /* @__PURE__ */ React.createElement("form", { onSubmit: handleSaveManagerClients, style: { display: "flex", flexDirection: "column", gap: "1rem" } }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: "0.85rem", color: "var(--text-muted)" } }, "Select which client partners this manager is authorized to view and manage:"), /* @__PURE__ */ React.createElement("div", { style: { maxHeight: "250px", overflowY: "auto", border: "1px solid #e2e8f0", padding: "0.5rem", borderRadius: "6px" } }, allClients.map((client) => {
    const isChecked = editClientIds.includes(client.id);
    return /* @__PURE__ */ React.createElement("label", { key: client.id, style: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0.5rem", cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: isChecked,
        onChange: () => {
          if (isChecked) {
            setEditClientIds(editClientIds.filter((id) => id !== client.id));
          } else {
            setEditClientIds([...editClientIds, client.id]);
          }
        }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.85rem", fontWeight: 600 } }, client.company_name, " (", client.client_code, ")"));
  })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" } }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary", onClick: () => setEditingManager(null) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "btn btn-navy" }, "Save Scope"))))));
}
