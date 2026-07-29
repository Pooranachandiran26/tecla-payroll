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

// resources/js/Pages/Payroll/PayrollApproval.jsx
var PayrollApproval_exports = {};
__export(PayrollApproval_exports, {
  default: () => PayrollApproval
});
module.exports = __toCommonJS(PayrollApproval_exports);
var import_react = __toESM(require("react"), 1);
var import_AuthenticatedLayout = __toESM(require("@/Layouts/AuthenticatedLayout"), 1);
var import_react2 = require("@inertiajs/react");
var import_RoleGuard = __toESM(require("../../Components/RoleGuard.jsx"), 1);
var import_useToast = __toESM(require("../../Hooks/useToast"), 1);
var import_PayrollCorrectionModal = __toESM(require("../../Components/PayrollCorrectionModal"), 1);
var import_BatchPayrollCorrectionModal = __toESM(require("../../Components/BatchPayrollCorrectionModal"), 1);
function PayrollApproval({ clients, selectedClientId, selectedMonth, run, items, preflight, cycleInfo, newHires = [], pendingSupplementaryRuns = [] }) {
  const { showToast } = (0, import_useToast.default)();
  const [clientId, setClientId] = (0, import_react.useState)(selectedClientId);
  const [month, setMonth] = (0, import_react.useState)(selectedMonth);
  const [showBreakdown, setShowBreakdown] = (0, import_react.useState)(false);
  const [showDisbursementModal, setShowDisbursementModal] = (0, import_react.useState)(false);
  const [showSupplementaryModal, setShowSupplementaryModal] = (0, import_react.useState)(false);
  const [showSingleCorrectionModal, setShowSingleCorrectionModal] = (0, import_react.useState)(false);
  const [showBatchCorrectionModal, setShowBatchCorrectionModal] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("open_supplementary_modal") === "true") {
        setShowSupplementaryModal(true);
      }
    }
  }, []);
  const getMonthOptions = () => {
    const options = [];
    const startDate = new Date(2026, 4, 1);
    const endDate = /* @__PURE__ */ new Date();
    endDate.setMonth(endDate.getMonth() + 2);
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const monthNum = String(currentDate.getMonth() + 1).padStart(2, "0");
      const label = currentDate.toLocaleString("default", { month: "long" }) + " " + year;
      options.push({ value: `${year}-${monthNum}-01`, label });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return options.reverse();
  };
  const { auth } = (0, import_react2.usePage)().props;
  const role = auth?.user?.role || "manager";
  const handleClientChange = (newClientId) => {
    setClientId(newClientId);
    import_react2.router.get(route("payroll.approval"), { client_id: newClientId, payroll_month: month }, { preserveState: false });
  };
  const handleMonthChange = (newMonth) => {
    setMonth(newMonth);
    import_react2.router.get(route("payroll.approval"), { client_id: clientId, payroll_month: newMonth }, { preserveState: false });
  };
  const activeItems = items ? items.filter((i) => !i.is_excluded) : [];
  const excludedItems = items ? items.filter((i) => i.is_excluded) : [];
  const handleApproveAndLock = () => {
    if (!run) return;
    import_react2.router.post(route("payroll.run.approve", run.id), {}, {
      onSuccess: () => {
        import_react2.router.post(route("payroll.run.lock", run.id), {}, {
          onSuccess: () => {
            import_react2.router.visit(route("invoices.index"));
          },
          onError: (errors) => {
            showToast({
              type: "error",
              title: "Lock Error",
              message: errors.error || "Unknown error locking batch"
            });
          }
        });
      },
      onError: (errors) => {
        showToast({
          type: "error",
          title: "Approval Error",
          message: errors.error || "Unknown error approving batch"
        });
      }
    });
  };
  const handleCreateSupplementary = () => {
    if (!run) return;
    import_react2.router.post(route("payroll.run.supplementary", run.id), {}, {
      onSuccess: () => {
        setShowSupplementaryModal(false);
        import_react2.router.reload();
      },
      onError: (errors) => {
        showToast({
          type: "error",
          title: "Supplementary Run Error",
          message: errors.error || "Unknown error creating supplementary run"
        });
      }
    });
  };
  const handleApproveSupplementary = (supplementaryRunId, currentStatus) => {
    const doLock = () => {
      import_react2.router.post(route("payroll.run.lock", supplementaryRunId), {}, {
        onSuccess: () => {
          import_react2.router.reload();
        },
        onError: (errors) => {
          showToast({
            type: "error",
            title: "Lock Error",
            message: errors.error || "Error locking supplementary run. It may now be in Approved state \u2014 retry to lock."
          });
          import_react2.router.reload();
        }
      });
    };
    if (currentStatus === "approved") {
      doLock();
    } else {
      import_react2.router.post(route("payroll.run.approve", supplementaryRunId), {}, {
        onSuccess: () => doLock(),
        onError: (errors) => {
          showToast({
            type: "error",
            title: "Approval Error",
            message: errors.error || "Error approving supplementary run"
          });
        }
      });
    }
  };
  return /* @__PURE__ */ import_react.default.createElement(import_RoleGuard.default, { allowedRoles: ["admin", "manager"] }, /* @__PURE__ */ import_react.default.createElement(import_AuthenticatedLayout.default, null, /* @__PURE__ */ import_react.default.createElement(import_react2.Head, { title: "Payroll Approval" }), /* @__PURE__ */ import_react.default.createElement("div", { style: { marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" } }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("h2", { style: { marginTop: "0.5rem" } }, "Approve & Lock Payroll Batch"), /* @__PURE__ */ import_react.default.createElement("p", { style: { color: "var(--text-muted)", fontSize: "0.9rem" } }, "Review consolidated totals and authorize bank file disbursements.")), run && (excludedItems.length > 0 || newHires.length > 0) && /* @__PURE__ */ import_react.default.createElement("div", { style: { backgroundColor: "#FFFBEB", border: "1px solid #FEF3C7", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "#92400E", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" } }, /* @__PURE__ */ import_react.default.createElement("strong", null, "Partial Batch: ", activeItems.length, " of ", items.length, " employees processed."), /* @__PURE__ */ import_react.default.createElement("span", null, excludedItems.length, " excluded + ", newHires.length, " new hires \u2014 click 'Create Supplementary Run' to process them."), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "btn btn-secondary btn-xs",
      style: { marginTop: "0.25rem" },
      onClick: () => setShowSupplementaryModal(true),
      disabled: role !== "admin",
      title: role !== "admin" ? "Only Administrators can trigger a supplementary run" : ""
    },
    "Create Supplementary Run for ",
    excludedItems.length,
    " Excluded + ",
    newHires.length,
    " New Hires"
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { padding: "1rem", marginBottom: "1.5rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: cycleInfo ? "1rem" : 0 } }, /* @__PURE__ */ import_react.default.createElement("label", { style: { fontWeight: 500, marginBottom: 0 } }, "Select Client Batch:"), /* @__PURE__ */ import_react.default.createElement("select", { className: "form-control", style: { width: "300px" }, value: clientId, onChange: (e) => handleClientChange(e.target.value) }, clients.map((c) => /* @__PURE__ */ import_react.default.createElement("option", { key: c.id, value: c.id }, c.company_name))), /* @__PURE__ */ import_react.default.createElement("select", { className: "form-control", style: { width: "150px" }, value: month, onChange: (e) => handleMonthChange(e.target.value) }, getMonthOptions().map((opt) => /* @__PURE__ */ import_react.default.createElement("option", { key: opt.value, value: opt.value }, opt.label)))), cycleInfo && /* @__PURE__ */ import_react.default.createElement("div", { className: "cycle-info-row", style: { display: "flex", gap: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u{1F4C5} Cycle Ends: ", /* @__PURE__ */ import_react.default.createElement("strong", null, cycleInfo.cycle_end_date)), cycleInfo.target_lock_date && /* @__PURE__ */ import_react.default.createElement("span", null, "\u{1F512} Target Lock Date: ", /* @__PURE__ */ import_react.default.createElement("strong", null, cycleInfo.target_lock_date)), cycleInfo.target_salary_credit_date && /* @__PURE__ */ import_react.default.createElement("span", null, "\u{1F4B0} Target Salary Credit: ", /* @__PURE__ */ import_react.default.createElement("strong", null, cycleInfo.target_salary_credit_date)))), /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { marginBottom: "1.5rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { className: "card-header", style: { backgroundColor: "#F8FAFC", borderBottom: "1px solid var(--border-color)" } }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "card-title", style: { margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" } }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u2708\uFE0F Pre-Flight Validation Gates"), /* @__PURE__ */ import_react.default.createElement("span", { className: `badge ${preflight && preflight.some((f) => f.type === "red") ? "badge-danger" : "badge-success"}` }, preflight && preflight.some((f) => f.type === "red") ? "Blockers Found" : "All Clear"))), /* @__PURE__ */ import_react.default.createElement("div", { style: { padding: "1rem" } }, preflight && preflight.length > 0 ? preflight.map((f, i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: `preflight-item status-${f.type}` }, /* @__PURE__ */ import_react.default.createElement("div", { className: "preflight-icon" }, f.type === "red" ? "\u274C" : f.type === "info" ? "\u2139\uFE0F" : "\u26A0\uFE0F"), /* @__PURE__ */ import_react.default.createElement("div", { className: "preflight-content" }, /* @__PURE__ */ import_react.default.createElement("strong", null, f.type === "red" ? "BLOCKER" : f.type === "info" ? "INFO" : "WARNING", ":"), " ", f.msg))) : /* @__PURE__ */ import_react.default.createElement("div", { className: "preflight-item status-green" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "preflight-icon" }, "\u2705"), /* @__PURE__ */ import_react.default.createElement("div", { className: "preflight-content" }, /* @__PURE__ */ import_react.default.createElement("strong", null, "ALL CLEAR:"), " No blockers or warnings found for this client and month.")))), run ? /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("div", { className: "grid-cols-4", style: { marginBottom: "1.5rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { className: "card metric-card" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-label" }, "Processed Employees"), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-value" }, run.total_employees_processed), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-trend text-muted" }, "Active in Roster")), /* @__PURE__ */ import_react.default.createElement("div", { className: "card metric-card" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-label" }, "Total Gross Earnings"), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-value" }, "\u20B9", parseFloat(run.total_gross_earnings).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-trend text-muted" }, "Sum of gross pays")), /* @__PURE__ */ import_react.default.createElement("div", { className: "card metric-card" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-label" }, "Total Net Disbursement"), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-value", style: { color: "var(--primary-navy)" } }, "\u20B9", parseFloat(run.total_net_disbursement).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-trend text-muted" }, "Amount sent to bank")), /* @__PURE__ */ import_react.default.createElement("div", { className: "card metric-card" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-label" }, "Employer Statutory Cost"), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-value", style: { color: "var(--status-warning)" } }, "\u20B9", parseFloat(run.total_employer_statutory_cost).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("span", { className: "metric-trend text-muted" }, "Er PF + Er ESI + Er LWF"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid-layout" }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { className: "card" }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1rem" } }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "card-title", style: { margin: 0 } }, "Employee Totals & Full Breakdown"), /* @__PURE__ */ import_react.default.createElement("button", { className: "btn btn-secondary btn-xs", onClick: () => setShowBreakdown(!showBreakdown) }, "Toggle Full Breakdown")), showBreakdown && /* @__PURE__ */ import_react.default.createElement("div", { style: { marginBottom: "1.5rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { className: "table-scroll-wrapper" }, /* @__PURE__ */ import_react.default.createElement("table", { className: "data-table extended-table" }, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("th", null, "Emp Code"), /* @__PURE__ */ import_react.default.createElement("th", null, "Employee Name"), /* @__PURE__ */ import_react.default.createElement("th", null, "Paid Days"), /* @__PURE__ */ import_react.default.createElement("th", null, "Gross"), /* @__PURE__ */ import_react.default.createElement("th", null, "Unpaid LOP (Info)"), /* @__PURE__ */ import_react.default.createElement("th", null, "PF"), /* @__PURE__ */ import_react.default.createElement("th", null, "ESI"), /* @__PURE__ */ import_react.default.createElement("th", null, "PT"), /* @__PURE__ */ import_react.default.createElement("th", null, "TDS"), /* @__PURE__ */ import_react.default.createElement("th", null, "Loan EMI"), /* @__PURE__ */ import_react.default.createElement("th", null, "Net Pay"))), /* @__PURE__ */ import_react.default.createElement("tbody", null, activeItems.map((r) => /* @__PURE__ */ import_react.default.createElement("tr", { key: r.id }, /* @__PURE__ */ import_react.default.createElement("td", null, r.employee_code), /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("strong", null, r.full_name)), /* @__PURE__ */ import_react.default.createElement("td", null, parseFloat(r.paid_days).toFixed(1), " days"), /* @__PURE__ */ import_react.default.createElement("td", null, "\u20B9", parseFloat(r.gross_total).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("td", { style: { background: "#F8FAFC" } }, "\u20B9", parseFloat(r.lop_deduction).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("td", null, "\u20B9", parseFloat(r.employee_pf).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("td", null, "\u20B9", parseFloat(r.employee_esi).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("td", null, "\u20B9", parseFloat(r.professional_tax).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("td", null, "\u20B9", parseFloat(r.tds_deduction).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("td", null, "\u20B9", parseFloat(r.loan_emi_deduction).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("td", { style: { color: "var(--primary-navy)" } }, /* @__PURE__ */ import_react.default.createElement("strong", null, "\u20B9", parseFloat(r.net_pay).toLocaleString())))))))), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--text-muted)" } }, "Consolidated Gross Earnings:"), /* @__PURE__ */ import_react.default.createElement("span", { style: { fontWeight: 600 } }, "\u20B9", parseFloat(run.total_gross_earnings).toLocaleString())), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--text-muted)" } }, "Employer Statutory Costs (PF + ESI + LWF):"), /* @__PURE__ */ import_react.default.createElement("span", { style: { fontWeight: 600 } }, "\u20B9", parseFloat(run.total_employer_statutory_cost).toLocaleString())), /* @__PURE__ */ import_react.default.createElement("hr", { style: { border: 0, borderTop: "1px solid var(--border-color)" } }), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1rem" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--primary-navy)" } }, "Status of Run:"), /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--primary-navy)", textTransform: "uppercase" } }, run.status))))), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "1.5rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { className: "card" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "card-title", style: { marginBottom: "0.5rem" } }, "Authorization Lock"), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" } }, "Approving and locking this run generates branch invoices, performs reconciliation, and sends automatic salary summary review emails."), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "btn btn-primary",
      style: { width: "100%", padding: "0.6rem" },
      onClick: handleApproveAndLock,
      disabled: role !== "admin" || run.status === "locked"
    },
    run.status === "locked" ? pendingSupplementaryRuns.length > 0 ? `\u2713 Parent Locked \u2014 ${pendingSupplementaryRuns.length} supplementary pending below` : "\u2713 Locked and Finalized" : "\u2713 Approve & Lock Batch"
  ), run.status === "locked" && /* @__PURE__ */ import_react.default.createElement("div", { style: { marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" } }, /* @__PURE__ */ import_react.default.createElement("h4", { style: { fontSize: "0.9rem", color: "var(--primary-navy)", marginBottom: "0.5rem" } }, "Stage 2: Official Payslips Release"), run.payslip_released_at ? /* @__PURE__ */ import_react.default.createElement("div", { style: { backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", padding: "0.75rem", borderRadius: "var(--radius-sm)", marginBottom: "0.75rem" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.8rem", color: "#065F46", fontWeight: 600, display: "block", marginBottom: "0.25rem" } }, "\u2705 Official Payslips Released on ", new Date(run.payslip_released_at).toLocaleString()), /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.75rem", color: "#047857" } }, "Released by: ", run.released_by_user_name || "Admin")) : /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" } }, "Official PDF payslips have not been released yet. Click below to generate and email official PDF payslips to employees."), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "btn btn-success",
      style: { width: "100%", padding: "0.6rem", backgroundColor: "#059669", borderColor: "#059669", color: "#ffffff" },
      onClick: () => {
        import_react2.router.post(route("payroll.run.release-payslips", run.id), {}, {
          onSuccess: () => showToast({ type: "success", title: "Success", message: "Official payslips released and emailed successfully." }),
          onError: (errs) => showToast({ type: "error", title: "Error", message: errs.error || "Error releasing payslips" })
        });
      }
    },
    run.payslip_released_at ? "\u{1F4C4} Re-send Official Payslips (All)" : "\u{1F4C4} Release Official PDF Payslips"
  ), /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: "0.5rem", marginTop: "0.75rem" } }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      className: "btn btn-secondary",
      style: { flex: 1, padding: "0.5rem", fontSize: "0.8rem" },
      onClick: () => setShowSingleCorrectionModal(true)
    },
    "\u{1F527} Correct Single Employee"
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      className: "btn btn-secondary",
      style: { flex: 1, padding: "0.5rem", fontSize: "0.8rem", backgroundColor: "#3B82F6", color: "#ffffff", borderColor: "#3B82F6" },
      onClick: () => setShowBatchCorrectionModal(true)
    },
    "\u26A1 Batch Correction"
  ))), /* @__PURE__ */ import_react.default.createElement(import_react2.Link, { href: route("payroll.processing", { client_id: clientId, payroll_month: month }), className: "btn btn-secondary", style: { width: "100%", marginTop: "0.5rem", padding: "0.6rem", display: "block", textAlign: "center", boxSizing: "border-box" } }, "Return to Calculations")), role !== "admin" && /* @__PURE__ */ import_react.default.createElement("div", { style: { backgroundColor: "var(--status-danger-bg)", borderRadius: "var(--radius-sm)", padding: "0.75rem", border: "1px solid #FFCDD2", marginTop: "0.5rem" } }, /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.75rem", fontWeight: 600, color: "var(--status-danger)" } }, "\u{1F512} Manager: Locking requires Administrator authorization. Stage 2 Payslip Release is allowed if you are assigned to this client."))), pendingSupplementaryRuns.length > 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { border: "2px solid #F59E0B", backgroundColor: "#FFFBEB", marginTop: "1.5rem" } }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "card-title", style: { marginBottom: "0.5rem", color: "#92400E" } }, "\u26A0\uFE0F ", pendingSupplementaryRuns.length, " Supplementary Run", pendingSupplementaryRuns.length > 1 ? "s" : "", " Pending Approval"), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: "0.8rem", color: "#92400E", marginBottom: "1rem" } }, "These supplementary runs must be approved and locked before all employees' payslips are finalized."), pendingSupplementaryRuns.map((sr) => /* @__PURE__ */ import_react.default.createElement("div", { key: sr.id, style: { borderTop: "1px solid #FEF3C7", paddingTop: "0.75rem", marginTop: "0.75rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" } }, /* @__PURE__ */ import_react.default.createElement("strong", null, "Run #", sr.id), /* @__PURE__ */ import_react.default.createElement("span", { className: "badge", style: { backgroundColor: sr.run_type === "correction" ? "#8B5CF6" : "#2563EB", color: "#FFFFFF", fontSize: "0.7rem", padding: "0.15rem 0.4rem" } }, sr.run_type === "correction" ? "Payroll Correction" : "New Hire Supplementary"), /* @__PURE__ */ import_react.default.createElement("span", { className: `badge ${sr.status === "draft" ? "badge-warning" : "badge-info"}`, style: { fontSize: "0.7rem" } }, sr.status)), /* @__PURE__ */ import_react.default.createElement("span", { style: { fontSize: "0.75rem", color: "var(--text-muted)" } }, sr.total_employees_processed, " employee", sr.total_employees_processed !== 1 ? "s" : "", " \xB7 \u20B9", parseFloat(sr.total_net_disbursement || 0).toLocaleString(), " net")), sr.total_employees_processed === 0 && /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: "0.75rem", color: "#B45309", marginBottom: "0.5rem", fontStyle: "italic" } }, "\u26A0\uFE0F 0 Employees Processed (All candidates skipped due to missing data)"), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      className: "btn btn-primary btn-sm",
      style: { width: "100%" },
      onClick: () => handleApproveSupplementary(sr.id, sr.status),
      disabled: role !== "admin"
    },
    sr.status === "approved" ? "\u{1F512} Lock Supplementary Run" : "\u2713 Approve & Lock Supplementary Run",
    " #",
    sr.id
  ))))))) : /* @__PURE__ */ import_react.default.createElement("div", { className: "card", style: { padding: "3rem", textAlign: "center", color: "var(--text-muted)" } }, "No active draft payroll run exists for this month. Go back to ", /* @__PURE__ */ import_react.default.createElement(import_react2.Link, { href: route("payroll.processing"), style: { textDecoration: "underline", color: "var(--primary-blue)" } }, "Payroll Processing"), " to generate calculations first."), showSupplementaryModal && (() => {
    const allCandidates = [
      ...excludedItems.map((item) => ({
        ...item,
        candidateType: "Excluded",
        isEligible: !item.exclusion_reason?.includes("No attendance data") && !item.exclusion_reason?.includes("Incomplete bank details"),
        statusText: item.exclusion_reason
      })),
      ...newHires.map((item) => ({
        ...item,
        candidateType: "New Hire",
        isEligible: item.is_eligible !== false,
        statusText: item.is_eligible === false ? `Skipped: ${(item.exclusions || ["No attendance data"]).join(", ")}` : `New Hire (Joined ${item.date_of_joining})`
      }))
    ];
    const eligibleCandidates = allCandidates.filter((c) => c.isEligible);
    const ineligibleCandidates = allCandidates.filter((c) => !c.isEligible);
    const totalCandidateCount = allCandidates.length;
    const eligibleCount = eligibleCandidates.length;
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "modal-overlay active" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "modal-box", style: { maxWidth: "650px" } }, /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" } }, /* @__PURE__ */ import_react.default.createElement("h3", { style: { color: "var(--primary-navy)", margin: 0 } }, "Create Supplementary Payroll Run"), /* @__PURE__ */ import_react.default.createElement("button", { className: "btn btn-secondary btn-xs", style: { border: "none", background: "transparent", fontSize: "1.25rem", padding: 0 }, onClick: () => setShowSupplementaryModal(false) }, "\xD7")), /* @__PURE__ */ import_react.default.createElement("p", { style: { fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.5 } }, "A supplementary run processes remaining eligible candidate employees separately."), /* @__PURE__ */ import_react.default.createElement("div", { className: "table-responsive", style: { marginBottom: "1rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" } }, /* @__PURE__ */ import_react.default.createElement("table", { className: "data-table", style: { fontSize: "0.85rem", marginBottom: 0 } }, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("th", null, "Employee"), /* @__PURE__ */ import_react.default.createElement("th", null, "Pre-Flight Status & Reason"))), /* @__PURE__ */ import_react.default.createElement("tbody", null, allCandidates.map((item, idx) => /* @__PURE__ */ import_react.default.createElement("tr", { key: item.id ? `cand-${item.id}` : `cand-idx-${idx}` }, /* @__PURE__ */ import_react.default.createElement("td", null, /* @__PURE__ */ import_react.default.createElement("strong", null, item.full_name), " (", item.employee_code, ")"), /* @__PURE__ */ import_react.default.createElement("td", null, item.isEligible ? /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--status-success)", fontWeight: 600 } }, "\u{1F7E2} Ready to Process") : /* @__PURE__ */ import_react.default.createElement("span", { style: { color: "var(--status-danger)", fontWeight: 600 } }, "\u{1F534} ", item.statusText))))))), totalCandidateCount > 0 && /* @__PURE__ */ import_react.default.createElement("div", { style: {
      backgroundColor: eligibleCount === 0 ? "#FEF2F2" : ineligibleCandidates.length > 0 ? "#FFFBEB" : "#F0FDF4",
      border: `1px solid ${eligibleCount === 0 ? "#FCA5A5" : ineligibleCandidates.length > 0 ? "#FCD34D" : "#86EFAC"}`,
      borderRadius: "var(--radius-sm)",
      padding: "0.85rem 1rem",
      marginBottom: "1.25rem"
    } }, /* @__PURE__ */ import_react.default.createElement("div", { style: {
      fontSize: "0.85rem",
      fontWeight: 600,
      color: eligibleCount === 0 ? "#991B1B" : ineligibleCandidates.length > 0 ? "#92400E" : "#166534",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    } }, eligibleCount === 0 ? "\u{1F6D1} Cannot Start Supplementary Run" : ineligibleCandidates.length > 0 ? "\u26A0\uFE0F Supplementary Run Summary" : "\u{1F7E2} Ready to Process"), /* @__PURE__ */ import_react.default.createElement("p", { style: {
      fontSize: "0.8rem",
      color: eligibleCount === 0 ? "#7F1D1D" : ineligibleCandidates.length > 0 ? "#B45309" : "#15803D",
      margin: "0.35rem 0 0 0",
      lineHeight: 1.45
    } }, eligibleCount === 0 ? /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, "Blocked: 0 of ", totalCandidateCount, " candidates can be processed. ", /* @__PURE__ */ import_react.default.createElement("strong", null, ineligibleCandidates.map((c) => c.full_name).join(", ")), " will be SKIPPED due to missing attendance data. Upload attendance before creating a supplementary run.") : ineligibleCandidates.length > 0 ? /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, "Summary: ", /* @__PURE__ */ import_react.default.createElement("strong", null, eligibleCount, " of ", totalCandidateCount, " candidate(s)"), " will be processed. ", /* @__PURE__ */ import_react.default.createElement("strong", null, ineligibleCandidates.map((c) => c.full_name).join(", ")), " will be SKIPPED due to missing attendance or incomplete data.") : /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, "Ready: All ", eligibleCount, " candidate(s) have valid attendance and will be processed in this supplementary run."))), /* @__PURE__ */ import_react.default.createElement("div", { className: "modal-footer", style: { marginTop: 0 } }, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowSupplementaryModal(false) }, "Cancel"), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        type: "button",
        className: "btn btn-primary",
        onClick: handleCreateSupplementary,
        disabled: eligibleCount === 0
      },
      "Confirm & Start Supplementary Run"
    ))));
  })(), /* @__PURE__ */ import_react.default.createElement(
    import_PayrollCorrectionModal.default,
    {
      isOpen: showSingleCorrectionModal,
      onClose: () => setShowSingleCorrectionModal(false),
      parentRun: run,
      items
    }
  ), /* @__PURE__ */ import_react.default.createElement(
    import_BatchPayrollCorrectionModal.default,
    {
      isOpen: showBatchCorrectionModal,
      onClose: () => setShowBatchCorrectionModal(false),
      parentRun: run,
      items
    }
  )));
}
