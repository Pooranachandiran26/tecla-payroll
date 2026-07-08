const fs = require("fs");
let content = fs.readFileSync("resources/js/Pages/Employees/EmployeeDetail.jsx", "utf8");

const startDocs = content.indexOf(`{/*  Tab 5: Documents & KYC Checklist  */}`);
const endDocs = content.indexOf(`{/*  Tab 6: Tax Declaration  */}`);
const startTax = content.indexOf(`{/*  1. REGIME SELECTION  */}`);
const endTax = content.indexOf(`{/*  Tab 7: Loans & Advances  */}`);
const startLoans = content.indexOf(`<div className="card">
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1.5rem","flexWrap":"wrap","gap":"1rem"}}>
                <div>
                  <h3 style={{"fontSize":"1.1rem","color":"var(--primary-navy)","marginBottom":"0.3rem"}}>Agency-Issued Salary Advances</h3>`);
const endLoans = content.indexOf(`{/*  end tab-container  */}`);

console.log("Docs Start:", startDocs, "End:", endDocs);
console.log("Tax Start:", startTax, "End:", endTax);
console.log("Loans Start:", startLoans, "End:", endLoans);
