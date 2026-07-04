import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function EmployeeAttendance() {
    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
    <AuthenticatedLayout>
            <Head title="Employee Attendance" />
            
      <div className="flex-row-between">
        <div>
          <h2>My Attendance Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View clock-in calendar, track work hour accumulations, and check unpaid absence ratios.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: '500' }}>
          <button className="btn btn-secondary btn-xs"  style={{ padding: '0.2rem 0.5rem' }}>←</button>
          <span style={{ fontWeight: '600', color: 'var(--primary-navy)', minWidth: '80px', textAlign: 'center' }} id="current-month-display">June 2026</span>
          <button className="btn btn-secondary btn-xs"  style={{ padding: '0.2rem 0.5rem' }}>→</button>
        </div>
      </div>
      
      <div id="sim-banner" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid var(--status-warning)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⏳</span>
          <span style={{ fontSize: '0.9rem', color: '#92400E' }} id="sim-banner-text">
            Leave request for Jun 28–30 is Pending Approval. These days will update to 'On Leave' once approved by the agency.
          </span>
        </div>
        <button className="btn btn-secondary btn-xs" id="btn-simulate" >Simulate Approval Update</button>
      </div>

      
      <div className="grid-layout">
        
        
        <div className="card">
          <h3 className="card-title">Attendance Calendar</h3>
          
          <div id="calendar-loading-message" style={{ display: 'none', alignItems: 'center', justifyContent: 'center', height: '300px', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--radius-sm)' }}></div>
          
          <div className="calendar-grid" id="calendar-container">
            
            <div className="calendar-day-header">Mon</div>
            <div className="calendar-day-header">Tue</div>
            <div className="calendar-day-header">Wed</div>
            <div className="calendar-day-header">Thu</div>
            <div className="calendar-day-header">Fri</div>
            <div className="calendar-day-header">Sat</div>
            <div className="calendar-day-header">Sun</div>

            
            <div className="calendar-day-cell present">1<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">2<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">3<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">4<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">5<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell other-month">6</div>
            <div className="calendar-day-cell other-month">7</div>

            <div className="calendar-day-cell present">8<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">9<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell half-day">10<span className="calendar-indicator half-day">H</span></div>
            <div className="calendar-day-cell present">11<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">12<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell other-month">13</div>
            <div className="calendar-day-cell other-month">14</div>

            <div className="calendar-day-cell present">15<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">16<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">17<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">18<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell present">19<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell other-month">20</div>
            <div className="calendar-day-cell other-month">21</div>

            <div className="calendar-day-cell present">22<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell leave">23<span className="calendar-indicator leave">SL</span></div>
            <div className="calendar-day-cell present">24<span className="calendar-indicator present">P</span></div>
            
            <div className="calendar-day-cell present" style={{ border: '2px solid var(--accent-gold)' }}>25<span className="calendar-indicator present">P</span></div>
            <div className="calendar-day-cell">26</div>
            <div className="calendar-day-cell other-month">27</div>
            <div className="calendar-day-cell absent" id="sim-cell-28">28<span className="calendar-indicator absent">A</span></div>

            <div className="calendar-day-cell absent" id="sim-cell-29">29<span className="calendar-indicator absent">A</span></div>
            <div className="calendar-day-cell absent" id="sim-cell-30">30<span className="calendar-indicator absent">A</span></div>
            
            <div className="calendar-day-cell other-month">1</div>
            <div className="calendar-day-cell other-month">2</div>
            <div className="calendar-day-cell other-month">3</div>
            <div className="calendar-day-cell other-month">4</div>
            <div className="calendar-day-cell other-month">5</div>
          </div>
        </div>

        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          
          <div className="card">
            <h3 className="card-title" id="summary-base-title">June Summary Base</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Presents (Full-time):</span>
                <span className="badge badge-success" style={{ fontSize: '0.85rem', fontWeight: 'bold', padding: '0.2rem 0.5rem' }}>16 Days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Half Days Logged:</span>
                <span className="badge badge-warning" style={{ fontSize: '0.85rem', fontWeight: 'bold', padding: '0.2rem 0.5rem' }}>1 Day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Approved Paid Leave:</span>
                <span className="badge badge-info" style={{ fontSize: '0.85rem', fontWeight: 'bold', padding: '0.2rem 0.5rem' }} id="sim-paid-leave">1 Day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unpaid Absences:</span>
                <span className="badge badge-danger" style={{ fontSize: '0.85rem', fontWeight: 'bold', padding: '0.2rem 0.5rem' }} id="sim-unpaid-absence">3 Days</span>
              </div>
              <hr style={{ border: '0', borderTop: '1px solid var(--border-color)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary-navy)' }}>
                <span>Total Payable Days:</span>
                <span>17.5 Days / 18 working</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <h3 className="card-title" style={{ margin: '0' }}>Daily Punch logs details</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Data source: Live Punch System (synced daily).</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift hours</th>
                <th>Clock In Stamp</th>
                <th>Clock Out Stamp</th>
                <th>Total Work Duration</th>
                <th>Location Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>June 25, 2026</td>
                <td>General (09:00 - 18:00)</td>
                <td>09:42 AM</td>
                <td>06:15 PM</td>
                <td style={{ fontWeight: '600' }}>8h 33m</td>
                <td>Mahindra Worli Office (IP: 103.45.20.12)</td>
                <td><span className="badge badge-success">Present</span></td>
              </tr>
              <tr>
                <td>June 24, 2026</td>
                <td>General (09:00 - 18:00)</td>
                <td>09:30 AM</td>
                <td>06:05 PM</td>
                <td style={{ fontWeight: '600' }}>8h 35m</td>
                <td>Mahindra Worli Office (IP: 103.45.20.12)</td>
                <td><span className="badge badge-success">Present</span></td>
              </tr>
              <tr>
                <td>June 23, 2026</td>
                <td>General (09:00 - 18:00)</td>
                <td>—</td>
                <td>—</td>
                <td style={{ fontWeight: '600' }}>0h 0m</td>
                <td>On approved Sick Leave (SL)</td>
                <td><span className="badge badge-info">Paid Leave</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
