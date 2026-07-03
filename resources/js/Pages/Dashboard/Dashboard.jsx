import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import StatsCard from '../../Components/ui/StatsCard';
import Card from '../../Components/ui/Card';
import Alert from '../../Components/ui/Alert';
import Badge from '../../Components/ui/Badge';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import { Users, ClipboardCheck, IndianRupee, PieChart, Activity } from 'lucide-react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { useRole } from '../../Contexts/RoleContext.jsx';

export default function Dashboard() {
  const { role } = useRole();

  return (
    <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
      
      <div className="flex-row-between">
        <div>
          <h2>Payroll Operations Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Overview of active employees, payroll status, and compliance alerts.</p>
        </div>
        <div style={{ fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontWeight: 500 }}>
          📅 Period: <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>June 2026</span>
        </div>
      </div>

      <Alert 
        type="warning"
        title="Smart Alerts:"
        action={<Button href="/bank-change-requests" variant="navy" size="xs" style={{ backgroundColor: 'var(--status-warning)' }}>Review Alerts</Button>}
        style={{ marginBottom: '1.5rem', borderLeft: '5px solid var(--status-warning)' }}
      >
        <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
          <li style={{ marginBottom: '0.25rem' }}>💡 3 employees had mid-cycle salary revisions this month — review the split calculation before approving.</li>
          <li style={{ marginBottom: '0.25rem' }}>⚠️ 1 employee's loan EMI was partially deferred due to the 50% deduction cap.</li>
          <li>✅ PF ECR, ESI File, and PT data auto-drafted from last approved run — ready for review.</li>
        </ul>
      </Alert>

      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <StatsCard 
          title="Active Employees" 
          value="154" 
          trendStr="12% vs last month" 
          trendType="up"
          icon={Users}
        />
        <StatsCard 
          title="Pending Attendances" 
          value="3 Clients" 
          trendStr="2 batches outstanding" 
          trendType="down"
          icon={ClipboardCheck}
        />
        <StatsCard 
          title="Revenue (June)" 
          value="₹42,50,000" 
          trendStr="8% markup base" 
          trendType="up"
          icon={IndianRupee}
        />
        
        {role === 'executive' ? (
          <div className="card metric-card locked-card">
            <div className="locked-blur">
              <span className="metric-label">Net Agency Margin</span>
              <span className="metric-value">₹5,10,000</span>
              <span className="metric-trend trend-up">▲ 12.5% avg profit</span>
            </div>
            <div className="locked-overlay" style={{ display: 'flex' }}>
              <div className="locked-badge">🔒 Locked</div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Margin Data Protected</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Admin approval required</span>
            </div>
          </div>
        ) : (
          <StatsCard 
            title="Net Agency Margin" 
            value="₹5,10,000" 
            trendStr="12.5% avg profit" 
            trendType="up"
            icon={PieChart}
          />
        )}
      </div>

      <div className="grid-layout">
        {/* Column 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <Card 
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="pulse-dot"></span>
                Today's Attendance Live Snapshot
              </span>
            }
            headerAction={<Button href="/payroll/live-monitor" variant="secondary" size="xs">Live Monitor</Button>}
          >
            <div className="grid-cols-4" style={{ textAlign: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--status-success-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--status-success)' }}>112</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Punched In</div>
              </div>
              <div style={{ backgroundColor: 'var(--status-info-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--status-info)' }}>8</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>On Leave</div>
              </div>
              <div style={{ backgroundColor: 'var(--status-warning-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--status-warning)' }}>34</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Not Punched In</div>
              </div>
              <div style={{ backgroundColor: '#F1F5F9', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>154</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Active</div>
              </div>
            </div>
          </Card>

          <Card 
            title="Pending Payroll Runs" 
            headerAction={<Button href="/payroll/processing" variant="primary" size="xs">Process New</Button>}
            noPadding
          >
            <DataTable 
              columns={[
                { key: 'client', label: 'Client Name', render: val => <strong>{val}</strong> },
                { key: 'cycle', label: 'Billing Cycle' },
                { key: 'count', label: 'Employee Count' },
                { key: 'attStatus', label: 'Attendance Status', render: val => <Badge variant={val.includes('Approved') ? 'success' : val.includes('Review') ? 'warning' : 'danger'}>{val}</Badge> },
                { key: 'payStatus', label: 'Payroll Status', render: val => <Badge variant={val === 'Draft' || val === 'Not Started' ? 'neutral' : 'warning'}>{val}</Badge> },
                { key: 'actions', label: 'Actions', render: (val, row) => <Button href={row.href} variant="secondary" size="xs">{val}</Button> }
              ]}
              data={[
                { id: 1, client: 'Mahindra Corp', cycle: 'Monthly (1st - 30th)', count: '42 Employees', attStatus: '✓ Client Approved', payStatus: 'Awaiting Approval', actions: 'Review & Approve', href: '/payroll/approval' },
                { id: 2, client: 'Tata Consultancy Services', cycle: 'Monthly (1st - 30th)', count: '90 Employees', attStatus: 'Under Review', payStatus: 'Draft', actions: 'Continue', href: '/payroll/processing' },
                { id: 3, client: 'Reliance Digital', cycle: 'Bi-Weekly', count: '22 Employees', attStatus: '✗ Not Received', payStatus: 'Not Started', actions: 'Upload Attendance', href: '/payroll/attendance-upload' }
              ]}
            />
          </Card>

          <Card 
            title="Recent Employee Onboarding Status" 
            headerAction={<Button href="/employees" variant="link" size="xs">All Employees</Button>}
            noPadding
          >
            <DataTable 
              columns={[
                { key: 'name', label: 'Employee Name', render: val => <strong>{val}</strong> },
                { key: 'client', label: 'Client Partner' },
                { key: 'date', label: 'Date of Joining' },
                { key: 'status', label: 'Status', render: (val, row) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Badge variant="warning">{val}</Badge>
                    <Badge variant="gold" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{row.docs}</Badge>
                  </div>
                ) },
                { key: 'actions', label: 'Action', render: () => <Button href="/employees/1" variant="secondary" size="xs">Review Docs</Button> }
              ]}
              data={[
                { id: 1, name: 'Vikram Rao', client: 'Reliance Digital', date: 'June 01, 2026', status: 'Onboarding', docs: '4/7 docs' },
                { id: 2, name: 'Amit Patel', client: 'Mahindra Corp', date: 'May 28, 2026', status: 'Onboarding', docs: '5/7 docs' }
              ]}
            />
          </Card>
        </div>

        {/* Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <Card 
            title="Compliance Due Dates" 
            headerAction={<Button href="/compliance" variant="link" size="xs">All Reports</Button>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--status-danger)', paddingLeft: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>PF ECR Contribution</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filing date: June 15, 2026</div>
                </div>
                <Badge variant="danger">3 Days Left</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--status-warning)', paddingLeft: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>ESI Contribution Return</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filing date: June 15, 2026</div>
                </div>
                <Badge variant="warning">3 Days Left</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--status-info)', paddingLeft: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>PT Slabs Filing</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filing date: June 20, 2026</div>
                </div>
                <Badge variant="info">8 Days Left</Badge>
              </div>
            </div>
          </Card>

          <Card title="System Activity Log" headerAction={role !== 'executive' && <Button href="/admin/activity-log" variant="link" size="xs">View Full</Button>}>
            {role === 'executive' ? (
              <div className="locked-card" style={{ padding: 0, border: 'none', background: 'none' }}>
                <div className="locked-blur" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                   <div><strong>Rajesh</strong> approved Payroll batch for <em>Mahindra Corp</em></div>
                   <div><strong>Sunita</strong> processed Attendance sheet for <em>Tata Consultancy Services</em></div>
                </div>
                <div className="locked-overlay" style={{ display: 'flex' }}>
                  <div className="locked-badge">🔒 Admin Only</div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Activity Logs Restricted</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <strong>Rajesh</strong> approved Payroll batch for <em>Mahindra Corp</em> (₹4.2L)
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Today, 02:40 PM</div>
                </div>
                <hr style={{ border: 0, borderTop: '1px solid var(--border-color)' }} />
                <div>
                  <strong>Sunita</strong> processed Attendance sheet for <em>Tata Consultancy Services</em>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Today, 11:15 AM</div>
                </div>
                <hr style={{ border: 0, borderTop: '1px solid var(--border-color)' }} />
                <div>
                  Employee <strong>Aarav Sharma</strong> submitted bank change request
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Yesterday, 04:30 PM</div>
                </div>
              </div>
            )}
          </Card>

        </div>
      </div>
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
