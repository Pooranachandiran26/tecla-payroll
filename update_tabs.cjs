
const fs = require("fs");
let content = fs.readFileSync("resources/js/Pages/Employees/EmployeeDetail.jsx", "utf8");

const startDocs = content.indexOf("{/*  Tab 5: Documents & KYC Checklist  */}");
const endLoans = content.indexOf("{/*  end tab-container  */}");

const newDocsHtml = `
        {/*  Tab 5: Documents & KYC Checklist  */}
        <div className="tab-content" data-tab="docs">
          <div style={{"display":"flex","flexDirection":"column","gap":"2rem"}}>
            
            {/*  Overall Progress Summary  */}
            <div className="card" style={{"border":"1px solid var(--border-color)","background":"#F8FAFC"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"flex":"1","minWidth":"300px"}}>
                  <h3 style={{"fontSize":"1.15rem","marginBottom":"0.4rem","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <span>📂</span> Documents &amp; KYC Verification
                  </h3>
                  <div style={{"fontSize":"0.95rem","fontWeight":"600","color":"var(--accent-gold)","marginTop":"0.5rem"}}>
                    {employee.documents_verified_count || 0} of {employee.documents_required_count || 5} required documents verified
                  </div>
                  <div style={{"width":"100%","maxWidth":"400px","height":"8px","backgroundColor":"#E2E8F0","borderRadius":"100px","margin":"0.5rem 0","overflow":"hidden"}}>
                    <div style={{"width": \`\${((employee.documents_verified_count || 0) / (employee.documents_required_count || 5)) * 100}%\`,"height":"100%","backgroundColor":"var(--status-success)","transition":"width var(--transition-normal)"}}></div>
                  </div>
                  {employee.status === "onboarding" && (
                  <p style={{"fontSize":"0.85rem","color":"var(--status-warning)","fontWeight":"500","margin":"0"}}>
                    ⚠ Submit and get all documents verified to activate this employee under {employee.client_name || "their assigned client"}.
                  </p>
                  )}
                </div>
                <div style={{"display":"flex","alignItems":"center","gap":"1rem","background":"#FFFFFF","padding":"0.75rem 1.25rem","borderRadius":"var(--radius-md)","border":"1px solid var(--border-color)","boxShadow":"var(--shadow-sm)","flexWrap":"wrap"}}>
                  <div style={{"display":"flex","flexDirection":"column"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>Prior Employment Flag</span>
                    <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Determines conditional docs</span>
                  </div>
                  <div style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>
                    {employee.prior_employment_flag ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>

            {/*  Documents List  */}
            <div className="card" style={{"padding":"0","overflow":"hidden","border":"1px solid var(--border-color)"}}>
              <div className="table-responsive">
                <table className="data-table" style={{"width":"100%"}}>
                  <thead>
                    <tr>
                      <th style={{"width":"35%"}}>Document Name</th>
                      <th style={{"width":"15%"}}>Requirement</th>
                      <th style={{"width":"20%"}}>Verification Status</th>
                      <th style={{"width":"30%","textAlign":"right"}}>Actions / Manager Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {window.renderDocumentRows && window.renderDocumentRows(employee)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 6: Tax Declaration  */}
        <div className="tab-content" data-tab="tax">
          <div style={{"padding":"3rem 1rem","textAlign":"center","color":"var(--text-muted)","fontStyle":"italic"}}>
            Tax Declarations will come soon (Dependent on Payroll Module &amp; Employee Login Portal).
          </div>
        </div>

        {/*  Tab 7: Loans & Advances  */}
        <div className="tab-content" data-tab="loans">
          <div style={{"padding":"3rem 1rem","textAlign":"center","color":"var(--text-muted)","fontStyle":"italic"}}>
            Loans &amp; Advances will come soon (Dependent on Payroll Module).
          </div>
        </div>

`;

const newContent = content.substring(0, startDocs) + newDocsHtml + content.substring(endLoans);
fs.writeFileSync("resources/js/Pages/Employees/EmployeeDetail.jsx", newContent);
console.log("Done updating tabs");
