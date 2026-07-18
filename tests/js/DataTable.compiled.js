var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// resources/js/Components/ui/DataTable/DataTable.jsx
var DataTable_exports = {};
__export(DataTable_exports, {
  default: () => DataTable
});
module.exports = __toCommonJS(DataTable_exports);

// resources/js/Utils/formatters.js
var classNames = (...classes) => classes.filter(Boolean).join(" ");

// resources/js/Components/ui/DataTable/DataTable.jsx
function DataTable({ columns = [], data = [], keyField = "id", className = "" }) {
  return /* @__PURE__ */ React.createElement("div", { className: classNames("table-responsive", className) }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, columns.map((col, index) => /* @__PURE__ */ React.createElement("th", { key: col.key || col.accessor || index, style: col.style, className: col.className }, col.label || col.header)))), /* @__PURE__ */ React.createElement("tbody", null, data.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: columns.length, style: { textAlign: "center", padding: "2rem" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "var(--text-muted)" } }, "No data available"))) : data.map((row, rowIndex) => /* @__PURE__ */ React.createElement("tr", { key: row[keyField] || rowIndex }, columns.map((col, colIndex) => {
    const cellKey = col.key || col.accessor;
    if (col.cell) {
      return /* @__PURE__ */ React.createElement("td", { key: cellKey || colIndex, style: col.style, className: col.className }, col.cell(row, rowIndex));
    }
    if (col.render) {
      return /* @__PURE__ */ React.createElement("td", { key: cellKey || colIndex, style: col.style, className: col.className }, col.render(row[cellKey], row, rowIndex));
    }
    return /* @__PURE__ */ React.createElement("td", { key: cellKey || colIndex, style: col.style, className: col.className }, row[cellKey]);
  }))))));
}
