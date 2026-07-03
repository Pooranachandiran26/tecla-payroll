import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import './ActivityLog.css';

const LOG_DATA = [
  {
    id: 1,
    category: "Security Flag",
    user: "System Alert",
    desc: "CRITICAL: Lock Integrity Breach Detected",
    detail: "Bank Account for Neha Patil (TEC-121) was modified by Rajesh (Admin) AFTER Payroll Batch #PR-0626 was Approved & Locked, but before final disbursement.",
    client: "Mahindra Corp",
    ip: "192.168.1.42",
    time: "Today, 10:15 AM",
    rowClass: "row-danger",
    badgeClass: "badge-lock-breach"
  },
  {
    id: 2,
    category: "Compliance Sync",
    user: "System Job",
    desc: "Auto-populated Draft Statutory Returns (PF ECR, ESI, PT)",
    detail: "Triggered by approval of Payroll Batch #PR-0626. Drafts ready for Admin review.",
    client: "Mahindra Corp",
    ip: "Cloud Engine",
    time: "Today, 02:41 PM",
    badgeClass: "badge-success",
    badgeStyle: { background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }
  },
  {
    id: 3,
    category: "Tax Adjustment",
    user: "System Job",
    desc: "Year-End TDS True-Up calculated for Aarav Sharma (TEC-088)",
    detail: "Adjustment of +₹3,200 applied to current payroll run based on final investment declarations.",
    client: "Mahindra Corp",
    ip: "Cloud Engine",
    time: "Today, 09:15 AM",
    badgeClass: "badge-info"
  },
  {
    id: 4,
    category: "Exit Cancelled",
    user: "Rajesh (Admin)",
    desc: "Cancelled exit process for Aarav Sharma (TEC-088)",
    detail: "Exit attempt aborted during active workflow. Employee status restored to Active.",
    client: "Mahindra Corp",
    ip: "192.168.1.45",
    time: "June 26, 2026 02:15 PM",
    badgeClass: "badge-secondary",
    badgeStyle: { background: "#E2E8F0", color: "#334155", border: "1px solid #CBD5E1" }
  },
  {
    id: 5,
    category: "Designation Flag",
    user: "Rajesh (Admin)",
    desc: "Rajesh (Admin) changed designation for Aarav Sharma (TEC-088) without a salary revision — verify if a pay change is also needed.",
    actionLink: "/employees/1/salary-revision",
    actionLinkText: "Review Revise Salary",
    client: "Mahindra Corp",
    ip: "192.168.1.45",
    time: "June 26, 2026 01:05 PM",
    rowClass: "row-warn",
    badgeClass: "badge-desig-warn"
  },
  {
    id: 6,
    category: "Profile Edit",
    user: "Rajesh (Admin)",
    desc: "Edited contact details for Aarav Sharma (TEC-088)",
    detail: "Fields changed: Personal Email, Phone Number — via Edit Profile panel",
    client: "Mahindra Corp",
    ip: "192.168.1.45",
    time: "June 26, 2026 12:50 PM",
    badgeClass: "badge-profile-edit"
  },
  {
    id: 7,
    category: "Salary Revision",
    user: "Rajesh (Admin)",
    desc: "Submitted salary revision approval for Aarav Sharma (TEC-088)",
    detail: "₹35,000 → ₹45,000 · Reason: Annual Appraisal Increment · Effective April 2026",
    client: "Mahindra Corp",
    ip: "192.168.1.45",
    time: "June 25, 2026 01:15 PM",
    badgeClass: "badge-gold"
  },
  {
    id: 8,
    category: "Payroll Lock",
    user: "Rajesh (Admin)",
    desc: "Approved and locked June 2026 payroll run for Mahindra Corp",
    detail: "42 employees processed · Total disbursement: ₹18,90,000",
    client: "Mahindra Corp",
    ip: "192.168.1.45",
    time: "June 25, 2026 02:40 PM",
    badgeClass: "badge-success"
  },
  {
    id: 9,
    category: "Attendance Sync",
    user: "Sunita (Manager)",
    desc: "Validated and uploaded biometric attendance sheet for June period",
    detail: "Coverage: 22 working days · 42 employees",
    client: "Mahindra Corp",
    ip: "192.168.1.68",
    time: "June 25, 2026 10:30 AM",
    badgeClass: "badge-info"
  },
  {
    id: 10,
    category: "Auto-Threshold",
    user: "System Job",
    desc: "ESI Contribution Period Active (Mid-Year Transition) for Aarav Sharma (TEC-088)",
    detail: "Gross ₹45,000 exceeds ESI limit, but deductions continue until Sep 30 under Contribution Period rules.",
    client: "Mahindra Corp",
    ip: "Cloud Engine",
    time: "June 25, 2026 09:00 AM",
    badgeClass: "badge-neutral"
  },
  {
    id: 11,
    category: "Bank Approve",
    user: "Rajesh (Admin)",
    desc: "Authorized secure disbursement account update for Neha Patil (TEC-121)",
    detail: "SBI ••••••••125432 → HDFC ••••••••993821 · IFSC verified",
    client: "Mahindra Corp",
    ip: "192.168.1.45",
    time: "June 24, 2026 04:30 PM",
    badgeClass: "badge-danger"
  },
  {
    id: 12,
    category: "Profile Request",
    user: "Aarav Sharma",
    desc: "Submitted banking details update request via Employee Portal",
    detail: "Pending admin review in Bank Change Requests queue",
    client: "Mahindra Corp",
    ip: "103.45.20.12",
    time: "June 24, 2026 03:10 PM",
    badgeClass: "badge-warning"
  }
];

export default function ActivityLog() {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const filteredLogs = LOG_DATA.filter(log => {
        const matchesSearch = !searchTerm || 
            log.desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
            log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.detail && log.detail.toLowerCase().includes(searchTerm.toLowerCase()));
            
        const matchesCategory = !categoryFilter || log.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });

    const resetFilter = () => {
        setSearchTerm('');
        setCategoryFilter('');
    };

    return (
        <RoleGuard allowedRoles={['admin']}>
            <AuthenticatedLayout>
                <Head title="Activity Log" />
                
                <div style={{ marginBottom: "1.5rem" }}>
                    <h2 style={{ marginTop: "0.5rem" }}>System Security Activity Log</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Audit history of all operational events, salary modifications, profile edits, banking detail changes, and role assignments.</p>
                </div>

                {/* Category Legend */}
                <div className="cat-legend">
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>Categories:</span>
                    <span className="badge badge-success">Payroll Lock</span>
                    <span className="badge badge-gold">Salary Revision</span>
                    <span className="badge badge-profile-edit">Profile Edit</span>
                    <span className="badge badge-desig-warn">Designation Flag</span>
                    <span className="badge badge-danger">Bank Approve</span>
                    <span className="badge badge-lock-breach">Security Flag</span>
                    <span className="badge badge-warning">Profile Request</span>
                    <span className="badge badge-info">Attendance Sync</span>
                    <span className="badge badge-neutral">Auto-Threshold</span>
                    <span className="badge badge-secondary" style={{ background: "#E2E8F0", color: "#334155", border: "1px solid #CBD5E1" }}>Exit Cancelled</span>
                    <span className="badge badge-success" style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" }}>Compliance Sync</span>
                </div>

                {/* Filters */}
                <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary-navy)" }}>Filters:</div>
                    <div>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search by user or action..." 
                            style={{ padding: "0.4rem 0.75rem", minWidth: "220px" }} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <select 
                            className="form-control" 
                            style={{ padding: "0.4rem 0.75rem" }}
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            <option value="Payroll Lock">Payroll Lock</option>
                            <option value="Salary Revision">Salary Revision</option>
                            <option value="Profile Edit">Profile Edit</option>
                            <option value="Designation Flag">Designation Flag</option>
                            <option value="Bank Approve">Bank Approve</option>
                            <option value="Security Flag">Security Flag</option>
                            <option value="Profile Request">Profile Request</option>
                            <option value="Attendance Sync">Attendance Sync</option>
                            <option value="Auto-Threshold">Auto-Threshold</option>
                            <option value="Exit Cancelled">Exit Cancelled</option>
                            <option value="Compliance Sync">Compliance Sync</option>
                            <option value="Tax Adjustment">Tax Adjustment</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem" }} onClick={resetFilter}>Reset</button>
                </div>

                {/* Logs Table Card */}
                <div className="card">
                    <div className="table-responsive">
                        <table className="data-table" id="log-table">
                            <thead>
                                <tr>
                                    <th>User Account</th>
                                    <th>Category</th>
                                    <th>Action Description</th>
                                    <th>Client Scope</th>
                                    <th>IP Address</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className={log.rowClass || ''}>
                                            <td><strong>{log.user}</strong></td>
                                            <td>
                                                <span className={`badge ${log.badgeClass}`} style={log.badgeStyle || {}}>
                                                    {log.category}
                                                </span>
                                            </td>
                                            <td className="action-cell">
                                                <div dangerouslySetInnerHTML={{ __html: log.desc.replace(/([A-Z][a-z]+ [A-Z][a-z]+ \(TEC-\d+\))/g, '<span class="action-employee">$1</span>') }} />
                                                
                                                {log.detail && (
                                                    <div className="action-detail" dangerouslySetInnerHTML={{ __html: log.detail.replace(/([A-Z][a-z]+ [A-Z][a-z]+ \(TEC-\d+\))/g, '<span class="action-employee">$1</span>') }} />
                                                )}
                                                
                                                {log.actionLink && (
                                                    <div className="action-flag">
                                                        ⚠ Action required: <Link href={log.actionLink} style={{ color: "var(--status-warning)", textDecoration: "underline", fontWeight: 600 }}>{log.actionLinkText}</Link>
                                                    </div>
                                                )}
                                            </td>
                                            <td>{log.client}</td>
                                            <td style={{ fontFamily: "monospace" }}>{log.ip}</td>
                                            <td>{log.time}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                                            No log entries match the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Container */}
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Showing <strong>1</strong> to <strong>{filteredLogs.length > 12 ? 12 : filteredLogs.length}</strong> of <strong>{LOG_DATA.length}</strong> activity logs
                        </div>
                        <ul className="pagination">
                            <li className="page-item disabled"><a className="page-link" href="#" onClick={e => e.preventDefault()}>Prev</a></li>
                            <li className="page-item active"><a className="page-link" href="#" onClick={e => e.preventDefault()}>1</a></li>
                            <li className="page-item"><a className="page-link" href="#" onClick={e => e.preventDefault()}>2</a></li>
                            <li className="page-item"><a className="page-link" href="#" onClick={e => e.preventDefault()}>3</a></li>
                            <li className="page-item"><a className="page-link" href="#" onClick={e => e.preventDefault()}>Next</a></li>
                        </ul>
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
