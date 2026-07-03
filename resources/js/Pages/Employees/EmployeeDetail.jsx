import React, { useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import './EmployeeDetail.css';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeeDetail() {
    useEffect(() => {
        // Load the legacy logic dynamically so it runs on client side after render
        import('./EmployeeDetailLogic.js').then(module => {
            console.log('Legacy logic loaded for EmployeeDetail');
        }).catch(err => console.error('Error loading legacy logic', err));
        
        return () => {
            // Cleanup logic if needed
        };
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
            <Head title="Employee Detail" />
            <div className="legacy-react-wrapper">
                
      <div style={{"marginBottom":"1.5rem"}}>
        <a href="/employees" style={{"fontSize":"0.85rem","fontWeight":"600"}}>← Back to Employees Directory</a>
        <div className="flex-row-between" style={{"marginTop":"0.5rem","marginBottom":"0"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"1rem"}}>
            <h2 id="page-emp-name">Aarav Sharma</h2>
            <span className="badge badge-success">Active</span>
          </div>
          <div style={{"display":"flex","gap":"0.75rem"}}>
            <a href="/employees/1/salary-revision" className="btn btn-navy">📈 Revise Salary</a>
            <a href="/employees/88/exit?stage=1" className="btn btn-danger">🚪 Initiate Exit Process</a>
            <button className="btn btn-secondary" onClick={(event) => { window.openEditPanel() }}>✏️ Edit Profile</button>
          </div>
        </div>
      </div>

      {/*  Tab Container  */}
      <div className="tab-container card">
        <ul className="tab-headers">
          <li className="active" data-tab="overview">Overview</li>
          <li data-tab="salary">Salary Structure &amp; History</li>
          <li data-tab="attendance" id="tab-header-attendance">Attendance Log (June)</li>
          <li data-tab="payslips">Generated Payslips</li>
          <li data-tab="docs">Documents</li>
          <li data-tab="tax">Tax Declaration</li>
          <li data-tab="loans">Loans &amp; Advances</li>
        </ul>

        {/*  Tab 1: Overview  */}
        <div className="tab-content active" data-tab="overview">
          <div className="grid-layout">

            {/*  Left Profile Panel  */}
            <div style={{"display":"flex","flexDirection":"column","gap":"1.25rem"}}>
              <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"1.25rem"}}>
                <div>
                  <h4 className="data-label">Employee Code</h4>
                  <span className="data-value">TEC-088</span>
                </div>
                <div>
                  <h4 className="data-label">Designation</h4>
                  <span className="data-value" id="display-designation">Senior Developer</span>
                </div>
                <div>
                  <h4 className="data-label">Client Assignment</h4>
                  <span className="data-value">Mahindra Corp</span>
                </div>
                <div>
                  <h4 className="data-label">Date of Joining</h4>
                  <span className="data-value">Jan 15, 2025</span>
                </div>
              </div>

              <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

              {/*  Contact Details (editable via Edit Profile)  */}
              <div>
                <h4 className="data-label" style={{"marginBottom":"0.75rem"}}>Contact Information</h4>
                <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"0.75rem"}}>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Personal Email</div>
                    <strong id="display-email" style={{"fontSize":"0.9rem"}}>aarav.sharma@gmail.com</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Phone Number</div>
                    <strong id="display-phone" style={{"fontSize":"0.9rem"}}>9876543210</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Emergency Contact</div>
                    <strong id="display-emergency" style={{"fontSize":"0.9rem"}}>9876543211</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Address</div>
                    <strong id="display-address" style={{"fontSize":"0.9rem"}}>Flat 4B, Andheri East, Mumbai</strong>
                  </div>
                </div>
              </div>

              <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

              <div>
                <h4 className="data-label" style={{"marginBottom":"0.75rem"}}>Disbursement Bank Details</h4>
                <div style={{"display":"grid","gridTemplateColumns":"repeat(3, 1fr)","gap":"1rem","backgroundColor":"#F8FAFC","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Bank Name</div>
                    <strong style={{"fontSize":"0.9rem"}}>HDFC Bank</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Account No (Masked)</div>
                    <strong style={{"fontSize":"0.9rem"}}>••••••••398571</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>IFSC Code</div>
                    <strong style={{"fontSize":"0.9rem"}}>HDFC0000060</strong>
                  </div>
                </div>
                <div style={{"marginTop":"0.5rem","fontSize":"0.75rem","color":"var(--text-muted)"}}>
                  🔒 Bank details can only be changed via the
                  <a href="/bank-change-requests" style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Bank Change Requests</a> approval flow.
                </div>
              </div>

              <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

              {/*  Salary Summary Card  */}
              <div>
                <h4 className="data-label" style={{"marginBottom":"0.75rem"}}>Salary Summary</h4>
                <div style={{"display":"grid","gridTemplateColumns":"repeat(4, 1fr)","gap":"1rem","backgroundColor":"#F8FAFC","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Basic Pay</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹35,000</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>HRA</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹14,000</strong>
                  </div>
                  <div>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Allowances</div>
                    <strong style={{"fontSize":"0.95rem","color":"var(--primary-navy)"}}>₹5,500</strong>
                  </div>
                  <div style={{"borderLeft":"2px solid var(--accent-gold)","paddingLeft":"0.75rem"}}>
                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Total CTC / Month</div>
                    <strong style={{"fontSize":"1.05rem","color":"var(--accent-gold)"}}>₹54,500</strong>
                  </div>
                </div>
                <div style={{"marginTop":"0.5rem","fontSize":"0.75rem","color":"var(--text-muted)"}}>
                  🔒 Salary structure is read-only. Use <a href="/employees/1/salary-revision" style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Revise Salary</a> to apply promotions or increments.
                </div>
              </div>
            </div>

            {/*  Right Statutory Profile  */}
            <div>
              <div className="card" style={{"backgroundColor":"#F8FAFC","border":"1px solid var(--border-color)"}}>
                <h3 style={{"fontSize":"1rem","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>Statutory Profile</h3>

                <div style={{"display":"flex","flexDirection":"column","gap":"0.75rem"}}>
                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Provident Fund (PF):</span>
                    <span className="badge badge-success">PF Active</span>
                  </div>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                    UAN: 100523485790
                  </div>

                  <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>State Insurance (ESI):</span>
                    <span className="badge badge-success" title="Active through current contribution period">ESI Active (Transition)</span>
                  </div>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                    IP No: 3114589723 (Gross &gt; ₹21,000)
                  </div>
                  <div style={{"marginTop":"0.5rem","backgroundColor":"#FFFBEB","border":"1px solid #FEF3C7","padding":"0.5rem 0.75rem","borderRadius":"var(--radius-sm)","fontSize":"0.75rem","color":"#92400E","display":"flex","alignItems":"flex-start","gap":"0.5rem"}}>
                    <span style={{"fontSize":"0.9rem","marginTop":"-0.1rem"}}>⚠️</span>
                    <div>
                      <strong>Contribution Period Status:</strong> ESI will auto-stop after Sep 30, since salary now exceeds the threshold.
                    </div>
                  </div>

                  <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>Professional Tax (PT):</span>
                    <span className="badge badge-success">PT Deducted</span>
                  </div>

                  <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"500"}}>TDS &amp; Tax Setup:</span>
                    <button className="btn btn-secondary btn-xs" onClick={(event) => { window.switchTab('tax') }}>📊 View Tax Declaration Tab</button>
                  </div>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginTop":"-0.5rem","textAlign":"right"}}>
                    Manage Regime &amp; Section 80C/80D Proofs
                  </div>
                </div>

                <div style={{"marginTop":"1rem","paddingTop":"1rem","borderTop":"1px solid var(--border-color)","fontSize":"0.75rem","color":"var(--text-muted)"}}>
                  🔒 Statutory toggles (PF/ESI/PT/TDS) can only be changed via the
                  <a href="/employees/create?id=88&amp;mode=edit-active" style={{"color":"var(--primary-navy)","fontWeight":"500"}}>Employee Configuration Form</a>
                  — not through Edit Profile.
                </div>
              </div>
            </div>

          </div>
        </div>

        {/*  Tab 2: Salary Structure  */}
        <div className="tab-content" data-tab="salary">
          <div style={{"display":"flex","flexDirection":"column","gap":"2.5rem"}}>
            
            {/*  Net Pay Summary Card  */}
            <div style={{"backgroundColor":"var(--primary-navy)","color":"white","padding":"1.5rem","borderRadius":"var(--radius-md)","display":"flex","justifyContent":"space-between","alignItems":"center","boxShadow":"0 4px 12px rgba(0,0,0,0.1)"}}>
              <div>
                <h3 style={{"fontSize":"1.25rem","margin":"0 0 0.25rem 0","color":"white"}}>Net Pay (Monthly)</h3>
                <div style={{"fontSize":"0.85rem","color":"#CBD5E1"}}>Gross Total (₹54,500) − Total Deductions (₹8,900)</div>
              </div>
              <div style={{"fontSize":"2.25rem","fontWeight":"bold","color":"var(--accent-gold)"}}>
                ₹45,600
              </div>
            </div>

            {/*  Current Active Salary Structure  */}
            <div>
              <div className="flex-row-between" style={{"marginBottom":"1rem"}}>
                <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Active Compensation Breakdown (Earnings)</h3>
                <span className="badge badge-success" style={{"fontSize":"0.85rem","padding":"0.35rem 0.75rem"}}>Effective From: April 01, 2026</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>Type</th>
                    <th>Monthly Rate</th>
                    <th>Annual Equivalent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1. Basic Pay</strong></td>
                    <td>Earnings</td>
                    <td>₹35,000</td>
                    <td>₹4,20,000</td>
                  </tr>
                  <tr>
                    <td><strong>2. HRA (House Rent Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹14,000</td>
                    <td>₹1,68,000</td>
                  </tr>
                  <tr>
                    <td><strong>3. Conveyance</strong></td>
                    <td>Earnings</td>
                    <td>₹1,600</td>
                    <td>₹19,200</td>
                  </tr>
                  <tr>
                    <td><strong>4. DA (Dearness Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹0</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>5. Medical Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹0</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>6. Special Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹3,900</td>
                    <td>₹46,800</td>
                  </tr>
                  <tr>
                    <td><strong>7. Other Additions</strong></td>
                    <td>Earnings</td>
                    <td>₹0</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>8. Arrears Amount</strong></td>
                    <td>Earnings</td>
                    <td>₹0</td>
                    <td>₹0</td>
                  </tr>
                  <tr style={{"backgroundColor":"var(--primary-navy-hover)","color":"white","fontWeight":"bold"}}>
                    <td>Gross Total</td>
                    <td>Total Earnings</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹54,500</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹6,54,000</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex-row-between" style={{"marginTop":"2.5rem","marginBottom":"1rem"}}>
                <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Deductions Breakdown</h3>
                <span style={{"fontSize":"0.85rem","color":"var(--text-muted)"}}>Monthly Statutory &amp; Compliance Deductions</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>Type</th>
                    <th>Monthly Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1. Employee PF</strong></td>
                    <td>Deductions</td>
                    <td>₹4,200</td>
                  </tr>
                  <tr>
                    <td><strong>2. Employee ESIC</strong></td>
                    <td>Deductions</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>3. Professional Tax</strong></td>
                    <td>Deductions</td>
                    <td>₹200</td>
                  </tr>
                  <tr>
                    <td><strong>4. Welfare Fund</strong></td>
                    <td>Deductions</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>5. LOP Deduction</strong></td>
                    <td>Deductions</td>
                    <td>₹0</td>
                  </tr>
                  <tr>
                    <td><strong>6. TDS</strong></td>
                    <td>Deductions</td>
                    <td>₹4,500</td>
                  </tr>
                  <tr style={{"backgroundColor":"#F1F5F9","fontWeight":"bold","borderTop":"2px solid var(--border-color)","borderBottom":"2px solid var(--border-color)"}}>
                    <td>Total Deductions</td>
                    <td>Total Deductions</td>
                    <td style={{"color":"var(--status-danger)"}}>₹8,900</td>
                  </tr>
                  <tr style={{"backgroundColor":"var(--primary-navy)","color":"white","fontWeight":"bold"}}>
                    <td>NET TAKE HOME</td>
                    <td>Gross Earnings − Total Deductions</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹45,600</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td><strong>Employer PF Contribution</strong></td>
                    <td><span className="badge badge-neutral">Employer Cost</span></td>
                    <td>₹4,200</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td><strong>Employer ESIC Contribution</strong></td>
                    <td><span className="badge badge-neutral">Employer Cost</span></td>
                    <td>₹0</td>
                  </tr>
                  <tr style={{"backgroundColor":"#F1F5F9","fontWeight":"bold","borderTop":"2px solid var(--border-color)","borderBottom":"2px solid var(--border-color)","fontSize":"1.1rem"}}>
                    <td>COST TO COMPANY (CTC)</td>
                    <td>Gross Earnings + Employer Contributions</td>
                    <td style={{"color":"var(--primary-navy)"}}>₹58,700</td>
                  </tr>
                </tbody>
              </table>

              <div style={{"marginTop":"1rem","padding":"0.75rem 1rem","background":"#F8FAFC","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","fontSize":"0.8rem","color":"var(--text-muted)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{"opacity":"0.45","flexShrink":"0"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Salary structure is <strong style={{"color":"var(--text-main)"}}>read-only</strong> for Active employees.
                To update compensation, use <a href="/employees/1/salary-revision" style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Revise Salary →</a>
              </div>
            </div>

            {/*  Salary History Table  */}
            <div>
              <div className="flex-row-between" style={{"marginBottom":"1rem"}}>
                <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Salary Revision History &amp; Audit Trail</h3>
                <span style={{"fontSize":"0.85rem","color":"var(--text-muted)"}}>Maintained automatically via Revise Salary workflow</span>
              </div>
              <div className="table-responsive">
                <table className="data-table" id="salary-history-table">
                  <thead>
                    <tr>
                      <th>Old CTC</th>
                      <th>New CTC</th>
                      <th>% Change</th>
                      <th>Effective Date</th>
                      <th>Reason</th>
                      <th>Approved By</th>
                      <th style={{"textAlign":"right"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>₹45,000</td>
                      <td><strong>₹54,500</strong></td>
                      <td><span className="badge badge-success">+21.1%</span></td>
                      <td>April 01, 2026</td>
                      <td>Annual Increment &amp; Performance Adjustment</td>
                      <td><strong>Rajesh - Agency Admin</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2026-04') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2026-04" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective April 01, 2026)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹54,500)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹35,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹14,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹3,900</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹8,900)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹4,200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹4,500</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹45,600</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹4,200)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹4,200</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹58,700</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>₹38,000</td>
                      <td><strong>₹45,000</strong></td>
                      <td><span className="badge badge-success">+18.4%</span></td>
                      <td>Oct 01, 2025</td>
                      <td>Promotion (Mid-year Review)</td>
                      <td><strong>Rajesh - Agency Admin</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2025-10') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2025-10" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective Oct 01, 2025)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹45,000)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹22,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹11,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹10,400</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹7,340)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,640</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹4,500</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹37,660</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹2,640)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹2,640</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹47,640</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>₹35,000</td>
                      <td><strong>₹38,000</strong></td>
                      <td><span className="badge badge-success">+8.6%</span></td>
                      <td>July 01, 2025</td>
                      <td>Market Correction</td>
                      <td><strong>Sunita - HR Manager</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2025-07') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2025-07" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective July 01, 2025)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹38,000)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹19,000</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹9,500</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹7,900</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹5,480)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,280</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹3,000</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹32,520</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹2,280)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹2,280</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹40,280</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>—</td>
                      <td><strong>₹35,000</strong></td>
                      <td><span className="badge badge-neutral">Base CTC</span></td>
                      <td>Jan 15, 2025</td>
                      <td>Initial Onboarding Structure Setup</td>
                      <td><strong>Rajesh - Agency Admin</strong></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup('breakup-2025-01') }}>View Breakup ▼</button>
                      </td>
                    </tr>
                    <tr id="breakup-2025-01" style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                      <td colSpan="7" style={{"padding":"1.5rem"}}>
                        <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                          <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                            Compensation Breakup Snapshot (Effective Jan 15, 2025)
                          </h4>
                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹35,000)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹17,500</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹8,750</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹1,600</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹7,150</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                              <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>8. Arrears Amount</div>
                              <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                          </div>

                          <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--status-danger)"}}>DEDUCTIONS (Total: ₹5,412.50)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>1. Employee PF</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,100</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>2. Employee ESIC</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹612.50</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>3. Professional Tax</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹200</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>4. Welfare Fund</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>5. LOP Deduction</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹0</div>
                            </div>
                            <div style={{"background":"#FFF5F5","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEB2B2"}}>
                              <div style={{"fontSize":"0.75rem","color":"#991B1B"}}>6. TDS</div>
                              <div style={{"fontWeight":"600","color":"#991B1B","fontSize":"0.95rem"}}>₹2,500</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"var(--primary-navy)","color":"white","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem"}}>
                            <span>NET TAKE HOME</span>
                            <span style={{"color":"var(--accent-gold)"}}>₹29,587.50</span>
                          </div>

                          <div style={{"marginTop":"1.5rem","marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"#64748B"}}>EMPLOYER CONTRIBUTIONS (Total: ₹2,712.50)</div>
                          <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem"}}>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>1. Employer PF</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹2,100</div>
                            </div>
                            <div style={{"background":"#FFFDF0","padding":"0.75rem","borderRadius":"var(--radius-sm)","border":"1px solid #FEF08A"}}>
                              <div style={{"fontSize":"0.75rem","color":"#854D0E"}}>2. Employer ESIC</div>
                              <div style={{"fontWeight":"600","color":"#854D0E","fontSize":"0.95rem"}}>₹612.50</div>
                            </div>
                          </div>

                          <div style={{"marginTop":"1.5rem","padding":"1rem","background":"#F1F5F9","border":"2px dashed var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","justifyContent":"space-between","fontWeight":"bold","fontSize":"1.1rem","color":"var(--primary-navy)"}}>
                            <span>COST TO COMPANY (CTC)</span>
                            <span>₹37,712.50</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 3: Attendance  */}
        <div className="tab-content" data-tab="attendance">
          <div style={{"display":"flex","flexDirection":"column","gap":"2rem"}}>
            {/*  Monthly Summary Strip  */}
            <div className="card" style={{"border":"1px solid var(--border-color)","background":"#F8FAFC","padding":"1.25rem"}}>
              <div className="flex-row-between" style={{"marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.75rem","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"display":"flex","alignItems":"center","gap":"1rem","flexWrap":"wrap"}}>
                  <h3 id="att-month-title" style={{"fontSize":"1.15rem","margin":"0","color":"var(--primary-navy)"}}>Attendance Summary (June 2026)</h3>
                  <div style={{"display":"flex","alignItems":"center","background":"#FFFFFF","borderRadius":"var(--radius-md)","padding":"0.25rem","border":"1px solid var(--border-color)","boxShadow":"0 1px 2px rgba(0,0,0,0.05)"}}>
                    <button className="btn btn-xs btn-secondary" onClick={(event) => { window.changeAttendanceMonth(-1) }} style={{"padding":"0.25rem 0.6rem","border":"none","background":"#F1F5F9","fontWeight":"bold","cursor":"pointer"}}>←</button>
                    <select id="attendance-month-select" onChange={(event) => { window.onAttendanceMonthSelect() }} style={{"background":"transparent","border":"none","fontWeight":"600","color":"var(--primary-navy)","padding":"0 0.5rem","cursor":"pointer","outline":"none"}}>
                      <option value="0">April 2026</option>
                      <option value="1">May 2026</option>
                      <option value="2" >June 2026</option>
                      <option value="3">July 2026</option>
                    </select>
                    <button className="btn btn-xs btn-secondary" onClick={(event) => { window.changeAttendanceMonth(1) }} style={{"padding":"0.25rem 0.6rem","border":"none","background":"#F1F5F9","fontWeight":"bold","cursor":"pointer"}}>→</button>
                  </div>
                </div>
                <span className="badge badge-navy" style={{"fontSize":"0.85rem"}}>Biometric &amp; Portal Sync</span>
              </div>
              <div style={{"display":"grid","gridTemplateColumns":"repeat(4, 1fr)","gap":"1rem","textAlign":"center"}}>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Present Days</div>
                  <div id="att-present-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-success)","marginTop":"0.25rem"}}>19 <span style={{"fontSize":"0.85rem","fontWeight":"500","color":"var(--text-muted)"}}>(+1 Half)</span></div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Leave Days</div>
                  <div id="att-leave-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-info)","marginTop":"0.25rem"}}>1</div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Absent Days</div>
                  <div id="att-absent-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--status-danger)","marginTop":"0.25rem"}}>1</div>
                </div>
                <div style={{"background":"white","padding":"1rem","borderRadius":"var(--radius-sm)","border":"1px solid var(--border-color)","borderBottom":"3px solid var(--accent-gold)"}}>
                  <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","textTransform":"uppercase","fontWeight":"600"}}>Total Working Days</div>
                  <div id="att-total-count" style={{"fontSize":"1.5rem","fontWeight":"700","color":"var(--primary-navy)","marginTop":"0.25rem"}}>22</div>
                </div>
              </div>
            </div>

            {/*  Calendar Grid  */}
            <div>
              <h4 style={{"fontSize":"1rem","marginBottom":"0.5rem","color":"var(--primary-navy)"}}>Monthly Calendar View</h4>
              <div className="calendar-grid" id="att-calendar-grid">
                {/*  Day Headers  */}
                <div className="calendar-day-header">Mon</div>
                <div className="calendar-day-header">Tue</div>
                <div className="calendar-day-header">Wed</div>
                <div className="calendar-day-header">Thu</div>
                <div className="calendar-day-header">Fri</div>
                <div className="calendar-day-header">Sat</div>
                <div className="calendar-day-header">Sun</div>

                {/*  Week 1  */}
                <div className="calendar-day-cell present"><span>1</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>2</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>3</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>4</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>5</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell other-month"><span>6</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>7</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 2  */}
                <div className="calendar-day-cell present"><span>8</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>9</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>10</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>11</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell half-day"><span>12</span><span className="calendar-indicator half-day">Half-day</span></div>
                <div className="calendar-day-cell other-month"><span>13</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>14</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 3  */}
                <div className="calendar-day-cell present"><span>15</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>16</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>17</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>18</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell absent"><span>19</span><span className="calendar-indicator absent">Absent</span></div>
                <div className="calendar-day-cell other-month"><span>20</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>21</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 4  */}
                <div className="calendar-day-cell present"><span>22</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell leave"><span>23</span><span className="calendar-indicator leave">On Leave</span></div>
                <div className="calendar-day-cell present"><span>24</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>25</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>26</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell other-month"><span>27</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>
                <div className="calendar-day-cell other-month"><span>28</span><span className="calendar-indicator" style={{"color":"#94A3B8"}}>Wknd</span></div>

                {/*  Week 5  */}
                <div className="calendar-day-cell present"><span>29</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell present"><span>30</span><span className="calendar-indicator present">Present</span></div>
                <div className="calendar-day-cell other-month"><span>1</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>2</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>3</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>4</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
                <div className="calendar-day-cell other-month"><span>5</span><span className="calendar-indicator" style={{"color":"#CBD5E1"}}>July</span></div>
              </div>
            </div>

            {/*  Daily Attendance Table  */}
            <div>
              <h4 style={{"fontSize":"1rem","marginBottom":"0.5rem","color":"var(--primary-navy)"}}>Daily Punch Logs</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Punch-In Time</th>
                      <th>Punch-Out Time</th>
                      <th>Hours Worked</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>June 30, 2026</td>
                      <td>09:30 AM</td>
                      <td>06:15 PM</td>
                      <td>8h 45m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 29, 2026</td>
                      <td>09:28 AM</td>
                      <td>06:05 PM</td>
                      <td>8h 37m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 26, 2026</td>
                      <td>09:40 AM</td>
                      <td>06:10 PM</td>
                      <td>8h 30m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 25, 2026</td>
                      <td>09:42 AM</td>
                      <td>06:15 PM</td>
                      <td>8h 33m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 24, 2026</td>
                      <td>09:30 AM</td>
                      <td>06:05 PM</td>
                      <td>8h 35m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 23, 2026</td>
                      <td>—</td>
                      <td>—</td>
                      <td>0h 00m</td>
                      <td><span className="badge badge-info">On Leave (Sick)</span></td>
                    </tr>
                    <tr>
                      <td>June 22, 2026</td>
                      <td>09:35 AM</td>
                      <td>06:10 PM</td>
                      <td>8h 35m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 19, 2026</td>
                      <td>—</td>
                      <td>—</td>
                      <td>0h 00m</td>
                      <td><span className="badge badge-danger">Absent</span></td>
                    </tr>
                    <tr>
                      <td>June 18, 2026</td>
                      <td>09:25 AM</td>
                      <td>06:00 PM</td>
                      <td>8h 35m</td>
                      <td><span className="badge badge-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>June 12, 2026</td>
                      <td>09:30 AM</td>
                      <td>01:30 PM</td>
                      <td>4h 00m</td>
                      <td><span className="badge badge-warning">Half-day</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 4: Payslips  */}
        <div className="tab-content" data-tab="payslips">
          <div style={{"display":"flex","flexDirection":"column","gap":"1.5rem"}}>
            <div className="flex-row-between">
              <h3 style={{"fontSize":"1.1rem","margin":"0"}}>Generated Payslips Archive</h3>
              <span style={{"fontSize":"0.85rem","color":"var(--text-muted)"}}>Historical records compiled from active payroll runs</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Gross Pay</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>June 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹48,000</strong> <span style={{"fontSize":"0.75rem","color":"var(--status-danger)"}}>(1 Absent Ded.)</span></td>
                    <td><span className="badge badge-warning">Generated</span></td>
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>May 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹50,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>April 2026</strong></td>
                    <td>₹54,500</td>
                    <td><strong>₹50,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                  <tr>
                    <td><strong>March 2026</strong></td>
                    <td>₹45,000</td>
                    <td><strong>₹41,000</strong></td>
                    <td><span className="badge badge-success">Disbursed</span></td>
                    <td><a href="/payroll/payslips" className="btn btn-secondary btn-xs">📥 Download PDF</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

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
                  <div style={{"fontSize":"0.95rem","fontWeight":"600","color":"var(--accent-gold)","marginTop":"0.5rem"}} id="doc-progress-text">
                    5 of 7 mandatory documents verified
                  </div>
                  <div style={{"width":"100%","maxWidth":"400px","height":"8px","backgroundColor":"#E2E8F0","borderRadius":"100px","margin":"0.5rem 0","overflow":"hidden"}}>
                    <div id="doc-progress-bar" style={{"width":"71.4%","height":"100%","backgroundColor":"var(--status-success)","transition":"width var(--transition-normal)"}}></div>
                  </div>
                  <p id="doc-progress-note" style={{"fontSize":"0.85rem","color":"var(--status-warning)","fontWeight":"500","margin":"0"}}>
                    ⚠ Employee cannot be moved to Active status until all mandatory documents are Verified
                  </p>
                </div>
                <div style={{"display":"flex","alignItems":"center","gap":"1rem","background":"#FFFFFF","padding":"0.75rem 1.25rem","borderRadius":"var(--radius-md)","border":"1px solid var(--border-color)","boxShadow":"var(--shadow-sm)","flexWrap":"wrap"}}>
                  <div style={{"display":"flex","flexDirection":"column"}}>
                    <span style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>Prior Employment Flag</span>
                    <span style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>Simulate conditional documents</span>
                  </div>
                  <label className="toggle-container">
                    <input type="checkbox" id="sim-prior-emp" className="toggle-input" defaultChecked={true} onChange={(event) => { window.togglePriorEmpSim() }} />
                    <span className="toggle-switch"></span>
                    <span id="prior-emp-label" style={{"fontSize":"0.85rem","fontWeight":"600","color":"var(--primary-navy)"}}>Yes</span>
                  </label>
                  <button className="btn btn-primary btn-sm" onClick={(event) => { window.openAddDocModal() }}>+ Add Document</button>
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
                  <tbody id="docs-tbody">
                    {/*  1. PAN Card  */}
                    <tr>
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>📄</span> PAN Card (copy)
                        </div>
                      </td>
                      <td><span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>Mandatory</span></td>
                      <td><span className="badge badge-success">Verified</span></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('PAN Card') }}>Preview</button>
                        <button className="btn btn-link btn-xs" style={{"marginLeft":"0.5rem"}} onClick={(event) => { window.downloadDocument('PAN Card') }}>Download</button>
                      </td>
                    </tr>
                    {/*  2. Aadhaar Card  */}
                    <tr>
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>📄</span> Aadhaar Card (copy)
                        </div>
                      </td>
                      <td><span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>Mandatory</span></td>
                      <td><span className="badge badge-success">Verified</span></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('Aadhaar Card') }}>Preview</button>
                        <button className="btn btn-link btn-xs" style={{"marginLeft":"0.5rem"}} onClick={(event) => { window.downloadDocument('Aadhaar Card') }}>Download</button>
                      </td>
                    </tr>
                    {/*  3. Bank Proof  */}
                    <tr>
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>📄</span> Bank Proof (cancelled cheque / passbook page)
                        </div>
                      </td>
                      <td><span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>Mandatory</span></td>
                      <td><span className="badge badge-success">Verified</span></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('Bank Proof') }}>Preview</button>
                        <button className="btn btn-link btn-xs" style={{"marginLeft":"0.5rem"}} onClick={(event) => { window.downloadDocument('Bank Proof') }}>Download</button>
                      </td>
                    </tr>
                    {/*  4. Educational Certificates  */}
                    <tr>
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>📄</span> Educational Certificates
                        </div>
                        <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginLeft":"1.5rem"}}>B.Tech Degree &amp; Marksheets attached</div>
                      </td>
                      <td><span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>Optional</span></td>
                      <td><span className="badge badge-success">Verified</span></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('Educational Certificates') }}>Preview</button>
                        <button className="btn btn-link btn-xs" style={{"marginLeft":"0.5rem"}} onClick={(event) => { window.downloadDocument('Educational Certificates') }}>Download</button>
                      </td>
                    </tr>
                    {/*  5. Signed Offer Letter  */}
                    <tr>
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>📄</span> Signed Offer Letter / Employment Contract
                        </div>
                      </td>
                      <td><span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>Mandatory</span></td>
                      <td><span className="badge badge-success">Verified</span></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('Signed Offer Letter') }}>Preview</button>
                        <button className="btn btn-link btn-xs" style={{"marginLeft":"0.5rem"}} onClick={(event) => { window.downloadDocument('Signed Offer Letter') }}>Download</button>
                      </td>
                    </tr>
                    {/*  6. Photograph  */}
                    <tr>
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>🖼</span> Photograph
                        </div>
                        <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginLeft":"1.5rem"}}>Mandatory but non-blocking (cosmetic only)</div>
                      </td>
                      <td><span className="badge badge-neutral" style={{"fontSize":"0.75rem"}}>Mandatory (Non-blocking)</span></td>
                      <td><span className="badge badge-success">Verified</span></td>
                      <td style={{"textAlign":"right"}}>
                        <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('Photograph') }}>Preview</button>
                        <button className="btn btn-link btn-xs" style={{"marginLeft":"0.5rem"}} onClick={(event) => { window.downloadDocument('Photograph') }}>Download</button>
                      </td>
                    </tr>
                    {/*  7. Relieving Letter (Conditional)  */}
                    <tr className="cond-doc-row" id="row-relieving">
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>📄</span> Previous Employer: Relieving Letter
                        </div>
                      </td>
                      <td><span className="badge badge-gold" style={{"fontSize":"0.75rem"}}>Conditional</span></td>
                      <td id="status-relieving"><span className="badge badge-warning">Pending Verification</span></td>
                      <td style={{"textAlign":"right"}}>
                        <div id="actions-relieving" style={{"display":"flex","gap":"0.4rem","justifyContent":"flex-end","alignItems":"center"}}>
                          <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('Relieving Letter') }}>Preview</button>
                          <span style={{"color":"var(--border-color)"}}>|</span>
                          <button className="btn btn-xs" style={{"backgroundColor":"var(--status-success)","color":"white"}} onClick={(event) => { window.approveDocument('relieving') }}>✓ Approve</button>
                          <button className="btn btn-danger btn-xs" onClick={(event) => { window.openRejectModal('relieving', 'Previous Employer: Relieving Letter') }}>✕ Reject</button>
                        </div>
                      </td>
                    </tr>
                    {/*  8. Payslips (Conditional)  */}
                    <tr className="cond-doc-row" id="row-payslips">
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}} title="Required for accurate combined-year TDS calculation.">
                          <span>📄</span> Previous Employer: Last 3 Months' Payslips <span style={{"cursor":"help","fontSize":"0.9rem"}}>ℹ️</span>
                        </div>
                        <div style={{"fontSize":"0.75rem","color":"var(--text-muted)","marginLeft":"1.5rem"}}>Required for accurate combined-year TDS calculation.</div>
                      </td>
                      <td><span className="badge badge-gold" style={{"fontSize":"0.75rem"}}>Conditional</span></td>
                      <td id="status-payslips"><span className="badge badge-warning">Pending Verification</span></td>
                      <td style={{"textAlign":"right"}}>
                        <div id="actions-payslips" style={{"display":"flex","gap":"0.4rem","justifyContent":"flex-end","alignItems":"center"}}>
                          <button className="btn btn-secondary btn-xs" onClick={(event) => { window.previewDocument('Payslips') }}>Preview</button>
                          <span style={{"color":"var(--border-color)"}}>|</span>
                          <button className="btn btn-xs" style={{"backgroundColor":"var(--status-success)","color":"white"}} onClick={(event) => { window.approveDocument('payslips') }}>✓ Approve</button>
                          <button className="btn btn-danger btn-xs" onClick={(event) => { window.openRejectModal('payslips', 'Previous Employer: Last 3 Months\' Payslips') }}>✕ Reject</button>
                        </div>
                      </td>
                    </tr>
                    {/*  9. Form 16 (Conditional)  */}
                    <tr className="cond-doc-row" id="row-form16">
                      <td>
                        <div style={{"fontWeight":"600","color":"var(--primary-navy)","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                          <span>📄</span> Previous Employer: Form 16
                        </div>
                      </td>
                      <td><span className="badge badge-gold" style={{"fontSize":"0.75rem"}}>Conditional</span></td>
                      <td id="status-form16"><span className="badge badge-danger">Not Uploaded</span></td>
                      <td style={{"textAlign":"right"}}>
                        <div id="actions-form16">
                          <button className="btn btn-navy btn-xs" onClick={(event) => { window.uploadMissingDoc('form16', 'Previous Employer: Form 16') }}>📤 Upload Document</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/*  Tab 6: Tax Declaration  */}
        <div className="tab-content" data-tab="tax">
          <div style={{"display":"flex","flexDirection":"column","gap":"2.5rem"}}>
            
            {/*  1. REGIME SELECTION  */}
            <div className="card" style={{"border":"1px solid var(--border-color)","background":"#F8FAFC"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap","gap":"1rem"}}>
                <div>
                  <h3 style={{"fontSize":"1.1rem","marginBottom":"0.4rem","color":"var(--primary-navy)"}}>Tax Regime Selection (FY 2025-26)</h3>
                  <div style={{"display":"flex","alignItems":"center","gap":"1rem","marginTop":"0.75rem"}}>
                    <span id="tax-regime-badge" className="badge badge-gold" style={{"fontSize":"1rem","padding":"0.4rem 1rem"}}>Current Regime: New Tax Regime</span>
                    <span style={{"fontSize":"0.82rem","color":"var(--text-muted)"}}>Declared On: April 02, 2025</span>
                  </div>
                </div>
                <div style={{"display":"flex","flexDirection":"column","alignItems":"flex-end","gap":"0.75rem"}}>
                  <div style={{"background":"#FFF","padding":"0.4rem 0.8rem","border":"1px solid #CBD5E1","borderRadius":"var(--radius-sm)","fontSize":"0.8rem","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                    <strong style={{"color":"var(--primary-navy)"}}>⚙️ Simulation Control:</strong>
                    <label style={{"display":"flex","alignItems":"center","gap":"0.3rem","margin":"0","cursor":"pointer"}}>
                      <input type="checkbox" id="sim-payroll-run" onChange={(event) => { window.togglePayrollRunSim() }} /> First Payroll Already Processed
                    </label>
                  </div>
                  <button className="btn btn-navy" onClick={(event) => { window.openRegimeModal() }}>🔄 Change Regime</button>
                </div>
              </div>
            </div>

            {/*  2. INVESTMENT DECLARATION  */}
            <div className="card" style={{"border":"1px solid var(--border-color)"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1.5rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.75rem"}}>
                <h3 style={{"fontSize":"1.1rem","color":"var(--primary-navy)"}}>Investment &amp; Exemption Declaration</h3>
                <span id="inv-regime-status" className="badge badge-info">Disabled (New Regime Active)</span>
              </div>

              {/*  Collapsed / Hidden state note for New Regime  */}
              <div id="new-regime-note" style={{"background":"#F1F5F9","border":"1px solid #CBD5E1","padding":"2rem","textAlign":"center","borderRadius":"var(--radius-md)"}}>
                <span style={{"fontSize":"2rem","display":"block","marginBottom":"0.5rem"}}>ℹ️</span>
                <h4 style={{"color":"var(--primary-navy)","fontSize":"1.05rem","marginBottom":"0.4rem"}}>Investment Declarations Not Applicable</h4>
                <p style={{"color":"var(--text-muted)","fontSize":"0.9rem","maxWidth":"500px","margin":"0 auto"}}>
                  Investment declarations (Section 80C, 80D, HRA, Sec 24b) are not applicable under the <strong>New Tax Regime</strong>. Switch to the Old Tax Regime above to enable itemized deduction entries.
                </p>
              </div>

              {/*  Enabled state form for Old Regime  */}
              <div id="old-regime-form" style={{"display":"flex","flexDirection":"column","gap":"2.5rem"}}>
                
                {/*  Section 80C  */}
                <div>
                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1rem"}}>
                    <h4 style={{"fontSize":"1rem","color":"var(--primary-navy)"}}>Section 80C Investments</h4>
                    <div style={{"fontSize":"0.85rem","fontWeight":"600","background":"#F1F5F9","padding":"0.4rem 0.8rem","borderRadius":"var(--radius-sm)"}}>
                      Running Total: <span id="sec80c-total">₹1,35,000</span> / <span style={{"color":"var(--text-muted)"}}>₹1,50,000 Cap</span>
                    </div>
                  </div>
                  <div id="sec80c-excess-note" className="alert-banner amber" style={{"display":"none","marginBottom":"1rem"}}>
                    ⚠ <strong>Cap Exceeded:</strong> Amount above ₹1,50,000 cap is recorded but not eligible for tax deduction.
                  </div>
                  <table className="data-table" style={{"width":"100%"}}>
                    <thead>
                      <tr>
                        <th>Investment Type</th>
                        <th>Description / Notes</th>
                        <th style={{"width":"200px"}}>Declared Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>PF Contribution (Employee)</strong></td>
                        <td>Auto-calculated from monthly payroll deductions</td>
                        <td><input type="number" id="val-80c-pf" className="form-control" value="21600" onInput={(event) => { window.calc80C() }} /></td>
                      </tr>
                      <tr>
                        <td><strong>ELSS (Equity Linked Savings Scheme)</strong></td>
                        <td>Mutual fund tax saver scheme</td>
                        <td><input type="number" id="val-80c-elss" className="form-control" value="50000" onInput={(event) => { window.calc80C() }} /></td>
                      </tr>
                      <tr>
                        <td><strong>Life Insurance Premium</strong></td>
                        <td>Self, spouse, or dependent children premium</td>
                        <td><input type="number" id="val-80c-lic" className="form-control" value="38400" onInput={(event) => { window.calc80C() }} /></td>
                      </tr>
                      <tr>
                        <td><strong>PPF (Public Provident Fund)</strong></td>
                        <td>Long-term statutory savings scheme</td>
                        <td><input type="number" id="val-80c-ppf" className="form-control" value="25000" onInput={(event) => { window.calc80C() }} /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  Section 80D  */}
                <div>
                  <h4 style={{"fontSize":"1rem","color":"var(--primary-navy)","marginBottom":"1rem"}}>Section 80D (Medical Insurance Premium)</h4>
                  <div className="grid-layout" style={{"gridTemplateColumns":"1fr 1fr","gap":"1.5rem"}}>
                    <div style={{"background":"#F8FAFC","padding":"1.25rem","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","marginBottom":"0.5rem"}}>
                        <label htmlFor="val-80d-self" style={{"fontWeight":"600","fontSize":"0.88rem"}}>Self / Family Premium</label>
                        <span id="cap-80d-self" className="badge badge-success">Cap: ₹25,000</span>
                      </div>
                      <input type="number" id="val-80d-self" className="form-control" value="18500" onInput={(event) => { window.calc80D() }} />
                      <div id="note-80d-self" style={{"fontSize":"0.78rem","color":"var(--status-warning)","marginTop":"0.4rem","display":"none"}}>
                        Amount exceeds ₹25,000 cap. Deduction restricted to ₹25,000.
                      </div>
                    </div>

                    <div style={{"background":"#F8FAFC","padding":"1.25rem","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)"}}>
                      <div style={{"display":"flex","justifyContent":"space-between","marginBottom":"0.5rem"}}>
                        <label htmlFor="val-80d-parents" style={{"fontWeight":"600","fontSize":"0.88rem"}}>Parents (Senior Citizen) Premium</label>
                        <span id="cap-80d-parents" className="badge badge-success">Cap: ₹50,000</span>
                      </div>
                      <input type="number" id="val-80d-parents" className="form-control" value="32000" onInput={(event) => { window.calc80D() }} />
                      <div id="note-80d-parents" style={{"fontSize":"0.78rem","color":"var(--status-warning)","marginTop":"0.4rem","display":"none"}}>
                        Amount exceeds ₹50,000 cap. Deduction restricted to ₹50,000.
                      </div>
                    </div>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  HRA Exemption Claim  */}
                <div>
                  <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1rem"}}>
                    <h4 style={{"fontSize":"1rem","color":"var(--primary-navy)"}}>HRA (House Rent Allowance) Exemption Claim</h4>
                    <div style={{"background":"#FFF","padding":"0.3rem 0.8rem","border":"1px solid #CBD5E1","borderRadius":"var(--radius-sm)","fontSize":"0.8rem","display":"flex","alignItems":"center","gap":"0.5rem"}}>
                      <strong style={{"color":"var(--primary-navy)"}}>⚙️ Simulation Control:</strong>
                      <select id="sim-hra-val" className="form-control" style={{"padding":"0.1rem 0.4rem","fontSize":"0.8rem","width":"150px"}} onChange={(event) => { window.toggleHraSim() }}>
                        <option value="11000">HRA Active (₹11,000)</option>
                        <option value="0">HRA Component ₹0</option>
                      </select>
                    </div>
                  </div>

                  {/*  HRA Disabled Note  */}
                  <div id="hra-disabled={true}-note" className="alert-banner red" style={{"display":"none","marginBottom":"1rem"}}>
                    ⛔ <strong>HRA Exemption Cannot Be Claimed:</strong> No HRA component in active salary structure (₹0 HRA).
                  </div>

                  <div id="hra-active-fields" className="grid-layout" style={{"gridTemplateColumns":"1fr 1fr","gap":"1.5rem","background":"#F8FAFC","padding":"1.25rem","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)"}}>
                    <div className="form-group">
                      <label htmlFor="hra-rent">Monthly Rent Paid (₹)</label>
                      <input type="number" id="hra-rent" className="form-control" value="12000" onInput={(event) => { window.calcHRA() }} />
                      <div style={{"fontSize":"0.78rem","color":"var(--text-muted)","marginTop":"0.3rem"}}>
                        Annualized Rent: <strong id="hra-annual-rent">₹1,44,000</strong>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="hra-pan">Landlord PAN <span id="hra-pan-asterisk" style={{"color":"var(--status-danger)"}}>*</span></label>
                      <input type="text" id="hra-pan" className="form-control" value="ABCDE1234F" onInput={(event) => { window.calcHRA() }} />
                      <div id="hra-pan-req-note" style={{"fontSize":"0.78rem","color":"var(--status-warning)","marginTop":"0.3rem"}}>
                        ⚠ Mandatory since annualized rent exceeds ₹1,00,000.
                      </div>
                      <div id="hra-pan-err" style={{"fontSize":"0.78rem","color":"var(--status-danger)","marginTop":"0.3rem","display":"none"}}>
                        ⛔ Landlord PAN is required for rent &gt; ₹1,00,000/yr.
                      </div>
                    </div>
                  </div>
                </div>

                <hr style={{"border":"0","borderTop":"1px solid var(--border-color)"}} />

                {/*  Home Loan Interest (Section 24b)  */}
                <div>
                  <h4 style={{"fontSize":"1rem","color":"var(--primary-navy)","marginBottom":"0.5rem"}}>Home Loan Interest (Section 24b)</h4>
                  <p style={{"fontSize":"0.85rem","color":"var(--text-muted)","marginBottom":"1rem"}}>
                    ℹ️ Note: The statutory cap of <strong>₹2,00,000</strong> applies to self-occupied property only.
                  </p>
                  <div style={{"background":"#F8FAFC","padding":"1.25rem","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","maxWidth":"400px"}}>
                    <div style={{"display":"flex","justifyContent":"space-between","marginBottom":"0.5rem"}}>
                      <label htmlFor="val-sec24b" style={{"fontWeight":"600","fontSize":"0.88rem"}}>Annual Interest Paid</label>
                      <span id="cap-sec24b" className="badge badge-success">Cap: ₹2,00,000</span>
                    </div>
                    <input type="number" id="val-sec24b" className="form-control" value="150000" onInput={(event) => { window.calcSec24b() }} />
                    <div id="note-sec24b" style={{"fontSize":"0.78rem","color":"var(--status-warning)","marginTop":"0.4rem","display":"none"}}>
                      Amount exceeds ₹2,00,000 cap. Deduction restricted to ₹2,00,000.
                    </div>
                  </div>
                </div>

                <div>
                  <button className="btn btn-primary" onClick={(event) => { alert('Investment declarations saved successfully.') }}>💾 Save Declarations</button>
                </div>

              </div>
            </div>

            {/*  3. PROOF SUBMISSION TRACKER  */}
            <div className="card" style={{"border":"1px solid var(--border-color)"}}>
              <h3 style={{"fontSize":"1.1rem","color":"var(--primary-navy)","marginBottom":"1rem"}}>Proof Submission Tracker</h3>
              
              <div className="alert-banner amber" style={{"marginBottom":"1.5rem"}}>
                ⚠ <strong>Proof Verification Deadline:</strong> February 28, 2026. Unverified declarations will be reversed in the final TDS calculation.
              </div>

              <table className="data-table" style={{"width":"100%"}}>
                <thead>
                  <tr>
                    <th>Declaration Item</th>
                    <th>Declared Amount</th>
                    <th>Proof Document Status</th>
                    <th>Verification Status</th>
                    <th style={{"textAlign":"right"}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>PF Contribution (Employee)</strong></td>
                    <td>₹21,600</td>
                    <td><span style={{"color":"var(--text-muted)"}}>Auto-Verified via Payroll</span></td>
                    <td><span className="badge badge-success">Verified</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" disabled={true}>Auto Uploaded</button></td>
                  </tr>
                  <tr>
                    <td><strong>ELSS (Mutual Funds)</strong></td>
                    <td>₹50,000</td>
                    <td id="proof-doc-elss">ELSS_Statement_2025.pdf</td>
                    <td id="proof-status-elss"><span className="badge badge-warning">Proof Submitted</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" onClick={(event) => { window.openProofModal('window.ELSS (Mutual Funds)', 'proof-doc-elss', 'proof-status-elss') }}>Upload Proof</button></td>
                  </tr>
                  <tr>
                    <td><strong>Life Insurance Premium</strong></td>
                    <td>₹38,400</td>
                    <td id="proof-doc-lic"><span style={{"color":"var(--text-muted)"}}>No document uploaded</span></td>
                    <td id="proof-status-lic"><span className="badge badge-neutral">Declared</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" onClick={(event) => { window.openProofModal('Life Insurance Premium', 'proof-doc-lic', 'proof-status-lic') }}>Upload Proof</button></td>
                  </tr>
                  <tr>
                    <td><strong>PPF (Public Provident Fund)</strong></td>
                    <td>₹25,000</td>
                    <td id="proof-doc-ppf">PPF_Passbook_Challan.pdf</td>
                    <td id="proof-status-ppf"><span className="badge badge-success">Verified</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" onClick={(event) => { window.openProofModal('window.PPF (Public Provident Fund)', 'proof-doc-ppf', 'proof-status-ppf') }}>Upload Proof</button></td>
                  </tr>
                  <tr>
                    <td><strong>Sec 80D - Self/Family Premium</strong></td>
                    <td>₹18,500</td>
                    <td id="proof-doc-80d-self">Health_Policy_2025.pdf</td>
                    <td id="proof-status-80d-self"><span className="badge badge-danger">Rejected</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" onClick={(event) => { window.openProofModal('Sec 80D - Self/Family Premium', 'proof-doc-80d-self', 'proof-status-80d-self') }}>Upload Proof</button></td>
                  </tr>
                  <tr>
                    <td><strong>Sec 80D - Parents Premium</strong></td>
                    <td>₹32,000</td>
                    <td id="proof-doc-80d-parents"><span style={{"color":"var(--text-muted)"}}>No document uploaded</span></td>
                    <td id="proof-status-80d-parents"><span className="badge badge-neutral">Declared</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" onClick={(event) => { window.openProofModal('Sec 80D - Parents Premium', 'proof-doc-80d-parents', 'proof-status-80d-parents') }}>Upload Proof</button></td>
                  </tr>
                  <tr>
                    <td><strong>HRA Exemption Claim</strong></td>
                    <td>₹1,44,000 / yr</td>
                    <td id="proof-doc-hra">Rent_Receipts_Q1_Q2.pdf</td>
                    <td id="proof-status-hra"><span className="badge badge-warning">Proof Submitted</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" onClick={(event) => { window.openProofModal('HRA Exemption Claim', 'proof-doc-hra', 'proof-status-hra') }}>Upload Proof</button></td>
                  </tr>
                  <tr>
                    <td><strong>Home Loan Interest (Sec 24b)</strong></td>
                    <td>₹1,50,000</td>
                    <td id="proof-doc-24b">Interest_Certificate_HDFC.pdf</td>
                    <td id="proof-status-24b"><span className="badge badge-success">Verified</span></td>
                    <td style={{"textAlign":"right"}}><button className="btn btn-secondary btn-xs" onClick={(event) => { window.openProofModal('Home Loan window.Interest (Sec 24b)', 'proof-doc-24b', 'proof-status-24b') }}>Upload Proof</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/*  4. TDS CALCULATION SUMMARY  */}
            <div className="card" style={{"border":"1px solid var(--border-color)"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1.5rem"}}>
                <h3 style={{"fontSize":"1.1rem","color":"var(--primary-navy)"}}>TDS Calculation Summary &amp; Monthly Projection</h3>
                <div style={{"display":"flex","gap":"1rem","alignItems":"center"}}>
                  <div style={{"background":"#F1F5F9","padding":"0.3rem 0.8rem","borderRadius":"var(--radius-sm)","fontSize":"0.85rem"}}>
                    <strong>Standard Deduction:</strong> <span id="summary-std-ded">₹75,000</span>
                  </div>
                  <div style={{"background":"#F1F5F9","padding":"0.3rem 0.8rem","borderRadius":"var(--radius-sm)","fontSize":"0.85rem"}}>
                    <strong>Employer NPS Cap:</strong> <span id="summary-nps-cap">14% of Basic</span>
                  </div>
                </div>
              </div>

              <div style={{"marginBottom":"1.5rem","background":"#F8FAFC","padding":"1.25rem","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","display":"flex","alignItems":"center","gap":"1.5rem"}}>
                <div style={{"width":"280px"}}>
                  <label htmlFor="val-nps-contrib" style={{"fontWeight":"600","fontSize":"0.88rem","display":"block","marginBottom":"0.3rem"}}>Employer NPS Contribution (₹/yr)</label>
                  <input type="number" id="val-nps-contrib" className="form-control" value="25000" />
                </div>
                <div style={{"fontSize":"0.85rem","color":"var(--text-muted)","flex":"1"}}>
                  ℹ️ Applicable under Section 80CCD(2). Cap automatically aligns to <strong id="nps-cap-note" style={{"color":"var(--primary-navy)"}}>14% of Basic Salary (New Tax Regime)</strong>.
                </div>
                <div>
                  <button className="btn btn-secondary btn-xs" onClick={(event) => { window.toggleTrueUpSim() }}>⚙️ Toggle True-Up Scenario</button>
                </div>
              </div>

              <table className="data-table" style={{"width":"100%"}}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Gross Salary</th>
                    <th>Exemptions &amp; Deductions</th>
                    <th>Projected Taxable Basis</th>
                    <th style={{"textAlign":"right"}}>Monthly TDS Deducted (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>April 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>May 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr style={{"background":"#FFFBEB","fontWeight":"600"}}><td>June 2025 (Current)</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right","color":"var(--primary-navy)"}}>₹3,100</td></tr>
                  <tr><td>July 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>August 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>September 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>October 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>November 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>December 2025</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>January 2026</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>February 2026</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  <tr><td>March 2026</td><td>₹45,000</td><td>₹6,250</td><td>₹38,750</td><td style={{"textAlign":"right"}}>₹3,100</td></tr>
                  
                  {/*  Final Month True-Up Row  */}
                  <tr id="trueup-recovery-row" style={{"background":"#FEF2F2","borderTop":"2px solid #FCA5A5"}}>
                    <td colSpan="4"><strong>Final Month True-Up (March 2026 / Exit Payout)</strong> — Recalculated against verified proofs</td>
                    <td style={{"textAlign":"right","color":"var(--status-danger)","fontWeight":"700"}}>Additional TDS Recovery: ₹4,250</td>
                  </tr>
                  <tr id="trueup-refund-row" style={{"background":"#F0FDF4","borderTop":"2px solid #86EFAC","display":"none"}}>
                    <td colSpan="4"><strong>Final Month True-Up (March 2026 / Exit Payout)</strong> — Recalculated against verified proofs</td>
                    <td style={{"textAlign":"right","color":"var(--status-success)","fontWeight":"700"}}>TDS Refund Adjustment: ₹2,800</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/*  5. FORM 16  */}
            <div className="card" style={{"border":"1px solid var(--border-color)"}}>
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"display":"flex","alignItems":"center","gap":"1.5rem"}}>
                  <span style={{"fontSize":"2.5rem"}}>🏛️</span>
                  <div>
                    <h3 style={{"fontSize":"1.1rem","color":"var(--primary-navy)","marginBottom":"0.3rem"}}>Form 16 (Part A &amp; B) — FY 2025-26</h3>
                    <p style={{"fontSize":"0.85rem","color":"var(--text-muted)","margin":"0"}}>Official statutory certificate of tax deduction at source issued by employer.</p>
                  </div>
                </div>
                <div style={{"display":"flex","gap":"1rem"}}>
                  <button className="btn btn-secondary" onClick={(event) => { window.previewForm16() }}>👁️ Preview</button>
                  <button className="btn btn-navy" onClick={(event) => { window.downloadForm16() }}>📥 Download PDF</button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/*  Tab 7: Loans & Advances  */}
        <div className="tab-content" data-tab="loans">
          <div style={{"display":"flex","flexDirection":"column","gap":"2.5rem"}}>
            <div className="card">
              <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"1.5rem","flexWrap":"wrap","gap":"1rem"}}>
                <div>
                  <h3 style={{"fontSize":"1.1rem","color":"var(--primary-navy)","marginBottom":"0.3rem"}}>Agency-Issued Salary Advances</h3>
                  <p style={{"color":"var(--text-muted)","fontSize":"0.85rem","margin":"0"}}>
                    Advances or short-term assistance provided directly by Tecla Payroll. Repayments are deducted from monthly net pay.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={(event) => { window.toggleNewLoanForm() }}>+ Issue New Salary Advance</button>
              </div>

              {/*  Active Advance Summary Table  */}
              <div className="table-responsive">
                <table className="data-table" id="agency-loans-table" style={{"width":"100%"}}>
                  <thead>
                    <tr>
                      <th>Advance ID</th>
                      <th>Purpose</th>
                      <th>Total Amount</th>
                      <th>Monthly EMI</th>
                      <th>Start Month</th>
                      <th>Balance Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody id="agency-loans-tbody">
                    <tr>
                      <td>ADV-2026-041</td>
                      <td>Emergency Medical Advance</td>
                      <td>₹15,000</td>
                      <td>₹2,500 / mo</td>
                      <td>April 2026</td>
                      <td><strong style={{"color":"var(--primary-navy)"}}>₹7,500</strong></td>
                      <td><span className="badge badge-warning">Active Deduction</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/*  Cross Reference Note  */}
              <div style={{"marginTop":"1.5rem","padding":"1rem","backgroundColor":"#F8FAFC","border":"1px solid var(--border-color)","borderLeft":"4px solid var(--accent-gold)","borderRadius":"var(--radius-sm)","fontSize":"0.85rem","color":"var(--text-main)"}}>
                🔗 <strong>Statutory Cross-Reference:</strong> This active monthly deduction (₹2,500) is directly cross-referenced in the <a href="/employees/1/salary-revision" style={{"color":"var(--primary-navy)","fontWeight":"600","textDecoration":"underline"}}>Salary Revision Screen</a> and automatically factored into the monthly payslip generation calculation.
              </div>

              {/*  Issue New Loan Form Card (hidden by default)  */}
              <div id="new-loan-form-card" style={{"display":"none","marginTop":"2rem","borderTop":"1px solid var(--border-color)","paddingTop":"1.5rem"}}>
                <h4 style={{"marginBottom":"1.25rem","color":"var(--primary-navy)","fontSize":"1.05rem"}}>Issue New Salary Advance</h4>
                <form onSubmit={(event) => { event.window.preventDefault(); window.submitNewAdvance(); }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="adv-amount">Total Advance Amount (₹) <span style={{"color":"var(--status-danger)"}}>*</span></label>
                      <input type="number" id="adv-amount" className="form-control" placeholder="e.g. 20000" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="adv-emi">Monthly Deduction EMI (₹) <span style={{"color":"var(--status-danger)"}}>*</span></label>
                      <input type="number" id="adv-emi" className="form-control" placeholder="e.g. 4000" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="adv-start">Deduction Start Month <span style={{"color":"var(--status-danger)"}}>*</span></label>
                      <input type="month" id="adv-start" className="form-control" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="adv-purpose">Purpose of Advance <span style={{"color":"var(--status-danger)"}}>*</span></label>
                      <input type="text" id="adv-purpose" className="form-control" placeholder="e.g. Personal Emergency, Education" required />
                    </div>
                  </div>
                  <div style={{"display":"flex","gap":"1rem","justifyContent":"flex-end","marginTop":"1rem"}}>
                    <button type="button" className="btn btn-secondary" onClick={(event) => { window.toggleNewLoanForm() }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Authorize Advance</button>
                  </div>
                </form>
              </div>
            </div>

            {/*  External Personal Loans / Garnishments  */}
            <div className="card">
              <h3 style={{"fontSize":"1.1rem","color":"var(--primary-navy)","marginBottom":"0.3rem"}}>External Personal Loans &amp; Garnishments</h3>
              <p style={{"color":"var(--text-muted)","fontSize":"0.85rem","marginBottom":"1.5rem"}}>
                Third-party attachments (e.g. court-ordered garnishments, bank loan direct attachments). Deducted post-tax per statutory guidelines.
              </p>

              <div className="table-responsive">
                <table className="data-table" style={{"width":"100%"}}>
                  <thead>
                    <tr>
                      <th>Attachment ID</th>
                      <th>Authority / Institution</th>
                      <th>Type</th>
                      <th>Monthly Deduction</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>GARN-2025-012</td>
                      <td>Family Court Order (Mumbai)</td>
                      <td>Statutory Maintenance</td>
                      <td>₹0 / mo (Satisfied)</td>
                      <td><span className="badge badge-success">Completed</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>{/*  end tab-container  */}
    
{/*  ══════════════════════════════════════════════════
       EDIT PROFILE SIDE PANEL
  ══════════════════════════════════════════════════  */}
  <div className="edit-panel-overlay" id="edit-panel-overlay" onClick={(event) => { window.handleOverlayClick(event) }}>
    <div className="edit-panel" id="edit-panel">

      <div className="edit-panel-header">
        <div>
          <h3>✏️ Edit Profile</h3>
          <div style={{"fontSize":"0.75rem","opacity":"0.75","marginTop":"0.15rem"}}>Aarav Sharma · TEC-088</div>
        </div>
        <button className="close-btn" onClick={(event) => { window.closeEditPanel() }}>×</button>
      </div>

      <div className="edit-panel-body">

        {/*  ── Editable Fields ──  */}
        <div className="edit-section-label">Editable — Personal &amp; Contact Details</div>

        {/*  Full Name  */}
        <div className="form-group">
          <label htmlFor="ep-name">Full Name</label>
          <input type="text" id="ep-name" className="form-control" value="Aarav Sharma"
            onInput={(event) => { window.onNameChange() }} />
          {/*  Name-change document upload — only appears when name is modified  */}
          <div className="name-doc-upload" id="name-doc-upload">
            ⚠ <strong>Name changes require a supporting document</strong> (e.g. marriage certificate, legal name change order).
            Upload before saving.
            <input type="file" id="name-doc-file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => { window.onNameDocUploaded() }} />
            <div className="ep-field-msg show" id="msg-name-doc" style={{"display":"block","marginTop":"0.3rem","fontSize":"0.75rem","color":"var(--status-warning)"}}>
              Document required — Save is disabled={true} until uploaded.
            </div>
          </div>
        </div>

        {/*  Designation  */}
        <div className="form-group">
          <label htmlFor="ep-designation">Designation / Role Label</label>
          <input type="text" id="ep-designation" className="form-control" value="Senior Developer"
            onInput={(event) => { window.onDesignationChange() }} />
          <div className="desig-changed-note" id="desig-changed-note">
            ⚠ Designation changed without a salary revision in this session.
            <a href="/employees/1/salary-revision" style={{"color":"var(--status-warning)","fontWeight":"600"}}>Review Revise Salary →</a>
            This will be flagged in the <a href="/admin/activity-log" style={{"color":"var(--status-warning)","fontWeight":"600"}}>Activity Log</a>.
          </div>
        </div>

        {/*  Personal Email  */}
        <div className="form-group">
          <label htmlFor="ep-email">Personal Email</label>
          <input type="email" id="ep-email" className="form-control" value="aarav.sharma@gmail.com"
            onBlur={(event) => { window.validateEpEmail() }} />
          <div className="ep-field-msg" id="ep-msg-email"></div>
        </div>

        {/*  Phone  */}
        <div className="form-group">
          <label htmlFor="ep-phone">Phone Number</label>
          <input type="text" id="ep-phone" className="form-control" value="9876543210" maxLength="10"
            onBlur={(event) => { window.validateEpPhone() }} />
          <div className="ep-field-msg" id="ep-msg-phone"></div>
        </div>

        {/*  Emergency Contact  */}
        <div className="form-group">
          <label htmlFor="ep-emergency">Emergency Contact Number</label>
          <input type="text" id="ep-emergency" className="form-control" value="9876543211" maxLength="10"
            onInput={(event) => { window.validateEpEmergency() }} />
          <div className="ep-field-msg" id="ep-msg-emergency"></div>
        </div>

        {/*  Address  */}
        <div className="form-group">
          <label htmlFor="ep-address">Residential Address</label>
          <textarea id="ep-address" className="form-control" rows="2">Flat 4B, Andheri East, Mumbai</textarea>
        </div>

        {/*  ── Locked Sections (read-only display) ──  */}
        <div className="edit-section-label">
          {/*  padlock SVG  */}
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style={{"verticalAlign":"middle","marginRight":"3px"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Read-Only — Cannot be changed via Edit Profile
        </div>

        {/*  Employee Code  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Employee Code</div>
            <div className="lock-value">TEC-088</div>
            <div className="lock-note">System-assigned. Cannot be changed.</div>
          </div>
        </div>

        {/*  Date of Joining  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Date of Joining</div>
            <div className="lock-value">January 15, 2025</div>
            <div className="lock-note">Locked — payroll has been processed. Cannot be changed after first payroll run.</div>
          </div>
        </div>

        {/*  Bank Details  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Bank Details (HDFC Bank · ••••••••398571 · HDFC0000060)</div>
            <div className="lock-note">Locked — use <a href="/bank-change-requests">Bank Change Requests</a> to update disbursement account.</div>
          </div>
        </div>

        {/*  Statutory IDs  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Statutory IDs (PAN · Aadhaar · UAN · ESI No)</div>
            <div className="lock-note">Locked — use <a href="/employees/create?id=88&mode=edit-active">Employee Configuration Form</a> to update statutory credentials.</div>
          </div>
        </div>

        {/*  Salary Structure  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Salary Structure (Basic ₹22,000 · HRA ₹11,000 · Allowances ₹12,000 · CTC ₹45,000)</div>
            <div className="lock-note">Locked — use <a href="/employees/1/salary-revision">Revise Salary →</a> to update compensation.</div>
          </div>
        </div>

        {/*  PF / ESI / PT / TDS Toggles  */}
        <div className="locked-section-block">
          <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <div className="lock-body">
            <div className="lock-title">Statutory Applicability (PF · ESI · PT · TDS)</div>
            <div className="lock-note">Locked — use <a href="/employees/create?id=88&mode=edit-active">Employee Configuration Form</a> to change statutory override toggles.</div>
          </div>
        </div>

      </div>{/*  end edit-panel-body  */}

      <div className="edit-panel-footer">
        <button className="btn btn-secondary" onClick={(event) => { window.closeEditPanel() }}>Cancel</button>
        <button className="btn btn-primary" id="ep-save-btn" onClick={(event) => { window.saveEditProfile() }}>Save Changes</button>
      </div>
    </div>
  </div>
</div>
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
