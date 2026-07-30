const fs = require('fs');
let content = fs.readFileSync('resources/js/Pages/Employees/EmployeeDetail.jsx', 'utf8');

const replacement1 = `<tbody>
                  <tr>
                    <td><strong>1. Basic Pay</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.basic_pay || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.basic_pay || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>2. HRA (House Rent Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.hra || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.hra || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>3. Conveyance</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.conveyance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.conveyance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>4. DA (Dearness Allowance)</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.da || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.da || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>5. Medical Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.medical_allowance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.medical_allowance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>6. Special Allowance</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.special_allowance || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.special_allowance || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>7. Other Additions</strong></td>
                    <td>Earnings</td>
                    <td>₹{Number(employee.other_additions || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(Number(employee.other_additions || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"var(--primary-navy-hover)","color":"white","fontWeight":"bold"}}>
                    <td>Gross Total</td>
                    <td>Total Earnings</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹{Number(employee.gross_monthly_salary || 0).toLocaleString('en-IN')}</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹{(Number(employee.gross_monthly_salary || 0) * 12).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>`;

const replacement2 = `<tbody>
                  <tr>
                    <td><strong>1. Employee PF</strong></td>
                    <td>Deductions</td>
                    <td>₹{Number(employee.employer_pf_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>2. Employee ESIC</strong></td>
                    <td>Deductions</td>
                    <td>₹{Number(employee.employer_esi_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>3. Professional Tax</strong></td>
                    <td>Deductions</td>
                    <td>₹200</td>
                  </tr>
                  <tr style={{"backgroundColor":"#F1F5F9","fontWeight":"bold","borderTop":"2px solid var(--border-color)","borderBottom":"2px solid var(--border-color)"}}>
                    <td>Total Deductions</td>
                    <td>Total Deductions</td>
                    <td style={{"color":"var(--status-danger)"}}>₹{Number((Number(employee.employer_pf_monthly || 0) + Number(employee.employer_esi_monthly || 0) + 200)).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"var(--primary-navy)","color":"white","fontWeight":"bold"}}>
                    <td>NET TAKE HOME</td>
                    <td>Gross Earnings − Total Deductions</td>
                    <td style={{"color":"var(--accent-gold)"}}>₹{Number(employee.net_take_home_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td><strong>Employer PF Contribution</strong></td>
                    <td><span className="badge badge-neutral">Employer Cost</span></td>
                    <td>₹{Number(employee.employer_pf_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#FFFDF0","color":"#64748B"}}>
                    <td><strong>Employer ESIC Contribution</strong></td>
                    <td><span className="badge badge-neutral">Employer Cost</span></td>
                    <td>₹{Number(employee.employer_esi_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{"backgroundColor":"#F1F5F9","fontWeight":"bold","borderTop":"2px solid var(--border-color)","borderBottom":"2px solid var(--border-color)","fontSize":"1.1rem"}}>
                    <td>COST TO COMPANY (CTC)</td>
                    <td>Gross Earnings + Employer Contributions</td>
                    <td style={{"color":"var(--primary-navy)"}}>₹{Number(employee.ctc_monthly || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>`;

const replacement3 = `<tbody>
                    {employee.salary_revisions?.length > 0 ? employee.salary_revisions.map((rev, index) => {
                      const effDate = new Date(rev.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
                      const oldCtc = Number(rev.previous_ctc_monthly || 0);
                      const newCtc = Number(rev.new_ctc_monthly || 0);
                      let pctChange = 0;
                      if (oldCtc > 0) pctChange = ((newCtc - oldCtc) / oldCtc * 100).toFixed(1);
                      return (
                        <React.Fragment key={rev.id}>
                          <tr>
                            <td>₹{oldCtc.toLocaleString('en-IN')}</td>
                            <td><strong>₹{newCtc.toLocaleString('en-IN')}</strong></td>
                            <td><span className={\`badge \${pctChange >= 0 ? 'badge-success' : 'badge-danger'}\`}>{pctChange >= 0 ? '+' : ''}{pctChange}%</span></td>
                            <td>{effDate}</td>
                            <td>{rev.revision_reason || 'Revision'}</td>
                            <td><strong>{rev.status === 'approved' ? 'Approved' : (rev.status === 'pending_approval' ? 'Pending' : 'Rejected')}</strong></td>
                            <td style={{"textAlign":"right"}}>
                              <button className="btn btn-link btn-xs" onClick={(event) => { window.toggleBreakup(\`breakup-\${rev.id}\`) }}>View Breakup ▼</button>
                            </td>
                          </tr>
                          <tr id={\`breakup-\${rev.id}\`} style={{"display":"none","backgroundColor":"#F8FAFC"}}>
                            <td colSpan="7" style={{"padding":"1.5rem"}}>
                              <div style={{"background":"white","border":"1px solid var(--border-color)","borderRadius":"var(--radius-sm)","padding":"1.25rem","boxShadow":"0 1px 3px rgba(0,0,0,0.05)"}}>
                                <h4 style={{"fontSize":"0.95rem","color":"var(--primary-navy)","marginBottom":"1rem","borderBottom":"1px solid var(--border-color)","paddingBottom":"0.5rem"}}>
                                  Compensation Breakup Snapshot (Effective {effDate})
                                </h4>
                                <div style={{"marginBottom":"1rem","fontSize":"0.85rem","fontWeight":"bold","color":"var(--primary-navy)"}}>EARNINGS (Gross: ₹{Number(rev.new_gross_monthly || 0).toLocaleString('en-IN')})</div>
                                <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(140px, 1fr))","gap":"1rem","marginBottom":"1.5rem"}}>
                                  <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>1. Basic Pay</div>
                                    <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹{Number(rev.new_basic_pay || 0).toLocaleString('en-IN')}</div>
                                  </div>
                                  <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>2. HRA</div>
                                    <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹{Number(rev.new_hra || 0).toLocaleString('en-IN')}</div>
                                  </div>
                                  <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>3. Conveyance</div>
                                    <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹{Number(rev.new_conveyance || 0).toLocaleString('en-IN')}</div>
                                  </div>
                                  <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>4. DA</div>
                                    <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹{Number(rev.new_da || 0).toLocaleString('en-IN')}</div>
                                  </div>
                                  <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>5. Medical Allowance</div>
                                    <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹{Number(rev.new_medical_allowance || 0).toLocaleString('en-IN')}</div>
                                  </div>
                                  <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>6. Special Allowance</div>
                                    <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹{Number(rev.new_special_allowance || 0).toLocaleString('en-IN')}</div>
                                  </div>
                                  <div style={{"background":"#F1F5F9","padding":"0.75rem","borderRadius":"var(--radius-sm)"}}>
                                    <div style={{"fontSize":"0.75rem","color":"var(--text-muted)"}}>7. Other Additions</div>
                                    <div style={{"fontWeight":"600","color":"var(--text-main)","fontSize":"0.95rem"}}>₹{Number(rev.new_other_additions || 0).toLocaleString('en-IN')}</div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    }) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem' }}>No salary revisions found for this employee.</td>
                      </tr>
                    )}
                  </tbody>`;

function replaceTbodyBlock(content, matchStr, replacement) {
    const idx = content.indexOf(matchStr);
    if (idx === -1) return content;
    const startTbody = content.indexOf('<tbody>', idx);
    let currentIdx = startTbody;
    let openTbody = 1;
    let endTbody = -1;
    while(currentIdx < content.length && currentIdx !== -1) {
        let nextOpen = content.indexOf('<tbody', currentIdx + 1);
        let nextClose = content.indexOf('</tbody>', currentIdx + 1);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
            openTbody++;
            currentIdx = nextOpen;
        } else {
            openTbody--;
            currentIdx = nextClose;
        }
        if (openTbody === 0) {
            endTbody = nextClose + '</tbody>'.length;
            break;
        }
    }
    if (endTbody !== -1) {
        return content.slice(0, startTbody) + replacement + content.slice(endTbody);
    }
    return content;
}

content = replaceTbodyBlock(content, '<th>Annual Equivalent</th>', replacement1);
content = replaceTbodyBlock(content, '>Monthly Statutory &amp; Compliance Deductions</span>', replacement2);
content = replaceTbodyBlock(content, 'id="salary-history-table"', replacement3);

// Let's also fix the static Active Salary label
content = content.replace(
  '<span className="badge badge-success" style={{"fontSize":"0.85rem","padding":"0.35rem 0.75rem"}}>Effective From: April 01, 2026</span>',
  '<span className="badge badge-success" style={{"fontSize":"0.85rem","padding":"0.35rem 0.75rem"}}>Effective Salary Structure</span>'
);

content = content.replace(
  'To update compensation, use <a href="/employees/1/salary-revision" style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Revise Salary →</a>',
  'To update compensation, use <Link href={`/employees/${employee.id}/salary-revision`} style={{"color":"var(--primary-navy)","fontWeight":"600"}}>Revise Salary →</Link>'
);

fs.writeFileSync('resources/js/Pages/Employees/EmployeeDetail.jsx', content, 'utf8');
console.log('Update complete');
