import React from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function SalaryRevision() {
    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
            <Head title="SalaryRevision" />
            <div className="main-content">
                
    <div id="navbar-placeholder"></div>

    
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/employees/88" style={{ fontSize: '0.85rem', fontWeight: '600' }}>← Back to Aarav's Profile</a>
        <h2 style={{ marginTop: '0.5rem' }}>Process Salary Revision</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Perform monthly CTC increments or corrections for Aarav Sharma. System handles statutory updates dynamically.</p>
      </div>

      <div className="grid-layout">
        {/*  Main Form Column  */}
        <div className="card">
          <form onSubmit={(e) => { e.preventDefault(); alert('Salary revision submitted for approval!'); window.location.href='/employees/88'; }}>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
              
              {/*  Current Salary Column  */}
              <div style={{ flex: '1', opacity: '0.85', borderRight: '1px solid var(--border-color)', paddingRight: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary-navy)' }}>
                  Current Salary structure
                </h3>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>EARNINGS</h4>
                <div className="form-group">
                  <label>1. Basic Pay (Monthly)</label>
                  <input type="text" className="form-control" value="₹17,000" disabled/>
                </div>
                <div className="form-group">
                  <label>2. HRA (House Rent Allowance)</label>
                  <input type="text" className="form-control" value="₹8,500" disabled/>
                </div>
                <div className="form-group">
                  <label>3. Conveyance</label>
                  <input type="text" className="form-control" value="₹1,600" disabled/>
                </div>
                <div className="form-group">
                  <label>4. DA (Dearness Allowance)</label>
                  <input type="text" className="form-control" value="₹0" disabled/>
                </div>
                <div className="form-group">
                  <label>5. Medical Allowance</label>
                  <input type="text" className="form-control" value="₹0" disabled/>
                </div>
                <div className="form-group">
                  <label>6. Special Allowance</label>
                  <input type="text" className="form-control" value="₹7,900" disabled/>
                </div>
                <div className="form-group">
                  <label>7. Other Additions</label>
                  <input type="text" className="form-control" value="₹0" disabled/>
                </div>
                <div className="form-group">
                  <label>8. Arrears Amount</label>
                  <input type="text" className="form-control" value="₹0" disabled/>
                </div>
                <div style={{ backgroundColor: '#F1F5F9', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center', color: 'var(--text-main)', marginTop: '1rem', marginBottom: '2rem' }}>
                  Gross Total: ₹35,000
                </div>

                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>DEDUCTIONS</h4>
                <div className="form-group">
                  <label>1. Employee PF</label>
                  <input type="text" className="form-control" value="₹2,100" disabled/>
                </div>
                <div className="form-group">
                  <label>2. Employee ESIC</label>
                  <input type="text" className="form-control" value="₹612.50" disabled/>
                </div>
                <div className="form-group">
                  <label>3. Professional Tax</label>
                  <input type="text" className="form-control" value="₹200" disabled/>
                </div>
                <div className="form-group">
                  <label>4. Welfare Fund</label>
                  <input type="text" className="form-control" value="₹0" disabled/>
                </div>
                <div className="form-group">
                  <label>5. LOP Deduction</label>
                  <input type="text" className="form-control" value="₹0" disabled/>
                </div>
                <div className="form-group">
                  <label>6. TDS</label>
                  <input type="text" className="form-control" value="₹2,500" disabled/>
                </div>
                <div style={{ backgroundColor: '#FFF5F5', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center', color: 'var(--status-danger)', marginTop: '1rem', marginBottom: '2rem' }}>
                  Total Deductions: ₹5,412.50
                </div>

                <div style={{ backgroundColor: 'var(--primary-navy)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', color: 'white', marginBottom: '2.5rem' }}>
                  Net Pay: <span style={{ color: 'var(--accent-gold)' }}>₹29,587.50</span>
                </div>

                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>STATUTORY APPLICABILITY &amp; LOANS</h4>
                <div className="form-group">
                  <label>PF Applicable (Contribution %)</label>
                  <input type="text" className="form-control" value="Yes (12% Employee + Employer)" disabled/>
                </div>
                <div className="form-group">
                  <label>ESI Applicable</label>
                  <input type="text" className="form-control" value="Yes (1.75% Employee)" disabled/>
                </div>
                <div className="form-group">
                  <label>PT Applicable</label>
                  <input type="text" className="form-control" value="Yes (₹200 / month)" disabled/>
                </div>
                <div className="form-group">
                  <label>TDS Applicable (Regime)</label>
                  <input type="text" className="form-control" value="Yes (New Regime)" disabled/>
                </div>
                <div className="form-group">
                  <label>Loan / Advance Deduction (Monthly)</label>
                  <input type="text" className="form-control" value="₹2,500 / month (Active)" disabled/>
                </div>
              </div>

              {/*  Proposed Salary Column  */}
              <div style={{ flex: '1' }}>
                <h3 style={{ fontSize: '1.1rem', borderBottom: '2px solid var(--primary-navy)', paddingBottom: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary-navy)' }}>
                  Proposed New Structure
                </h3>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-navy)', marginBottom: '1rem' }}>EARNINGS</h4>
                <div className="form-group">
                  <label htmlFor="new-basic">1. Basic Pay (Monthly)</label>
                  <input type="number" id="new-basic" className="form-control" value="22000" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-hra">2. HRA (House Rent Allowance)</label>
                  <input type="number" id="new-hra" className="form-control" value="11000" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-conveyance">3. Conveyance</label>
                  <input type="number" id="new-conveyance" className="form-control" value="1600" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-da">4. DA (Dearness Allowance)</label>
                  <input type="number" id="new-da" className="form-control" value="0" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-medical">5. Medical Allowance</label>
                  <input type="number" id="new-medical" className="form-control" value="0" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-special">6. Special Allowance</label>
                  <input type="number" id="new-special" className="form-control" value="10400" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-other">7. Other Additions</label>
                  <input type="number" id="new-other" className="form-control" value="0" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-arrears">8. Arrears Amount</label>
                  <input type="number" id="new-arrears" className="form-control" value="0" onChange="recalculateProposed()"/>
                </div>
                <div style={{ backgroundColor: 'var(--primary-navy)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center', color: 'white', marginTop: '1rem', marginBottom: '2rem' }}>
                  Gross Total: <span id="new-gross-display" style={{ color: 'var(--accent-gold)' }}>₹45,000</span>
                </div>

                <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-navy)', marginBottom: '1rem' }}>DEDUCTIONS</h4>
                <div className="form-group">
                  <label htmlFor="new-emp-pf">1. Employee PF</label>
                  <input type="number" id="new-emp-pf" className="form-control" value="2640" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-emp-esic">2. Employee ESIC</label>
                  <input type="number" id="new-emp-esic" className="form-control" value="0" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-pt-ded">3. Professional Tax</label>
                  <input type="number" id="new-pt-ded" className="form-control" value="200" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-welfare">4. Welfare Fund</label>
                  <input type="number" id="new-welfare" className="form-control" value="0" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-lop">5. LOP Deduction</label>
                  <input type="number" id="new-lop" className="form-control" value="0" onChange="recalculateProposed()"/>
                </div>
                <div className="form-group">
                  <label htmlFor="new-tds-ded">6. TDS</label>
                  <input type="number" id="new-tds-ded" className="form-control" value="4500" onChange="recalculateProposed()"/>
                </div>
                <div style={{ backgroundColor: '#FFF5F5', border: '1px solid #FEB2B2', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center', color: 'var(--status-danger)', marginTop: '1rem', marginBottom: '2rem' }}>
                  Total Deductions: <span id="new-deductions-display">₹7,340</span>
                </div>

                <div style={{ backgroundColor: 'var(--primary-navy)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', color: 'white', marginBottom: '2.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  Net Pay: <span id="new-net-display" style={{ color: 'var(--accent-gold)' }}>₹37,660</span>
                </div>

                <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-navy)', marginBottom: '1rem' }}>STATUTORY APPLICABILITY &amp; LOANS</h4>
                <div className="form-group">
                  <label htmlFor="new-pf">PF Applicable (Contribution %)</label>
                  <select id="new-pf" className="form-control" onChange="recalculateProposed()">
                    <option value="yes">Yes (12% Employee + Employer)</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="new-esi">ESI Applicable</label>
                  <select id="new-esi" className="form-control" onChange="recalculateProposed()">
                    <option value="yes">Yes (1.75% Employee)</option>
                    <option value="no">No (Exceeds ₹21k limit)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="new-pt">PT Applicable</label>
                  <select id="new-pt" className="form-control" onChange="recalculateProposed()">
                    <option value="yes">Yes (₹200 / month)</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="new-tds">TDS Applicable (Regime)</label>
                  <select id="new-tds" className="form-control" onChange="recalculateProposed()">
                    <option value="new">Yes (New Regime)</option>
                    <option value="old">Yes (Old Regime)</option>
                    <option value="no">No TDS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="new-loan">Loan / Advance Deduction (Monthly)</label>
                  <input type="text" id="new-loan" className="form-control" value="₹2,500 / month (Active)" readOnly style={{ backgroundColor: '#F1F5F9', color: 'var(--text-muted)', cursor: 'not-allowed' }}/>
                </div>
              </div>

            </div>

            {/*  Increment comparison alert  */}
            <div style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid #C8E6C9', padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--status-success)' }} id="comparison-label">
                📈 Revision Summary: ₹35,000 → ₹45,000 (+28.6% Increase)
              </span>
            </div>

            {/*  Parameters  */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="effective-date">Effective From Date</label>
                <input type="date" id="effective-date" className="form-control" value="2026-06-01" required />
              </div>
              <div className="form-group">
                <label htmlFor="revision-reason">Reason for Revision</label>
                <select id="revision-reason" className="form-control">
                  <option value="appraisal">Annual Performance Appraisal</option>
                  <option value="promotion">Role Promotion Adjustment</option>
                  <option value="correction">Statutory Structure Correction</option>
                  <option value="other">Other / Cost of Living Adjustment</option>
                </select>
              </div>
            </div>

            {/*  Action Buttons  */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <a href="/employees/88" className="btn btn-secondary">Cancel</a>
              <button type="submit" className="btn btn-primary">Submit for Approval</button>
            </div>

          </form>
        </div>

        {/*  Sidebar Guidelines  */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ backgroundColor: 'var(--status-warning-bg)', borderLeft: '4px solid var(--status-warning)' }}>
            <h4 style={{ color: '#E65100', marginBottom: '0.5rem' }}>Statutory Threshold Alert</h4>
            <p style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#E65100' }}>
              Increasing the CTC above ₹21,000 will automatically disable the employee's ESI eligibility starting next payroll run. Ensure the employee is notified regarding medical benefits changes.
            </p>
          </div>
        </div>
      </div>
    
  </div>

  
  
            
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
