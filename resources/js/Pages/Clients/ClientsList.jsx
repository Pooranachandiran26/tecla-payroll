import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import './ClientsList.css';
import RoleGuard from '../../Components/RoleGuard.jsx';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import Input from '../../Components/ui/Input';
import useToast from '../../Hooks/useToast';
import { usePage } from '@inertiajs/react';

export default function ClientsList({ clients, stats = {} }) {
  const { auth } = usePage().props;
  const { showToast } = useToast();
  const queryParams = new URLSearchParams(window.location.search);
  const [filters, setFilters] = useState({
    search: queryParams.get('search') || '',
    contractType: queryParams.get('contractType') || '',
    onboarding: queryParams.get('onboarding') || '',
    status: queryParams.get('status') || 'all',
    industry: queryParams.get('industry') || '',
    am: queryParams.get('am') || '',
    expiry: queryParams.get('expiry') || '',
  });

  const [deactivateClient, setDeactivateClient] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ client: null, confirmText: '', reason: '' });

  const handleDeactivate = () => {
    if (!deactivateClient) return;
    router.post(route('clients.deactivate', deactivateClient.id), {}, {
      onSuccess: () => {
        setDeactivateClient(null);
        showToast({ type: 'success', title: 'Success', message: 'Client deactivated successfully.' });
      },
      onError: (errors) => {
        showToast({ type: 'error', title: 'Error', message: errors.error || 'Failed to deactivate client.' });
      }
    });
  };

  const handleRestore = (clientId) => {
    router.post(route('clients.restore', clientId), {}, {
      onSuccess: () => {
        showToast({ type: 'success', title: 'Success', message: 'Client restored successfully.' });
      },
      onError: (errors) => {
        showToast({ type: 'error', title: 'Error', message: errors.error || 'Failed to restore client.' });
      }
    });
  };

  const handleDelete = () => {
    if (deleteDialog.confirmText !== 'DELETE') {
      showToast({ type: 'error', title: 'Error', message: 'Please type DELETE exactly.' });
      return;
    }
    if (deleteDialog.reason.length < 10) {
      showToast({ type: 'error', title: 'Error', message: 'Reason must be at least 10 characters.' });
      return;
    }

    router.delete(route('clients.destroy', deleteDialog.client.id), {
      data: {
        confirm_text: deleteDialog.confirmText,
        reason: deleteDialog.reason
      },
      onSuccess: () => {
        setDeleteDialog({ client: null, confirmText: '', reason: '' });
        showToast({ type: 'success', title: 'Success', message: 'Client deleted successfully.' });
      },
      onError: (errors) => {
        showToast({ type: 'error', title: 'Error', message: errors.error || 'Failed to delete client.' });
      }
    });
  };

  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const params = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] !== '' && filters[key] !== 'all') {
          params[key] = filters[key];
        }
      });
      router.get(route('clients.index'), params, { preserveState: true, replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      contractType: '',
      onboarding: '',
      status: 'all',
      industry: '',
      am: '',
      expiry: '',
    });
  };

  const formatRupee = (amount) => {
    if (amount === 0 || amount === null || amount === undefined) return '—';
    const str = Math.round(amount).toString();
    let lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    return '₹' + res;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(d.getDate()).padStart(2, '0')} ${mNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const dataList = clients.data || [];
  const meta = clients.meta || {};

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <AuthenticatedLayout>
        <Head title="Clients List" />
        <div className="legacy-react-wrapper">
          <div className="flex-row-between">
            <div>
              <h2>Clients Directory</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Manage all client profiles, contracts, and view high-level payroll metrics.
              </p>
            </div>
            <Link href={route('clients.create')} className="btn btn-primary">➕ Add New Client</Link>
          </div>

          {/* Advanced Filters Row */}
          <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--primary-navy)" }}>Filters:</div>

            <div style={{ flex: "1", minWidth: "200px" }}>
              <input type="text" name="search" className="form-control" placeholder="Search by Client Name, Code, GSTIN or PAN..."
                style={{ padding: "0.4rem 0.75rem" }} value={filters.search} onChange={handleFilterChange} />
            </div>

            <div>
              <select name="contractType" className="form-control" style={{ padding: "0.4rem 0.75rem" }} title="Contract Type" value={filters.contractType} onChange={handleFilterChange}>
                <option value="">All Contract Types</option>
                <option value="agency">Agency / Staffing</option>
                <option value="eor">EOR / Pass-through</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <select name="onboarding" className="form-control" style={{ padding: "0.4rem 0.75rem" }} title="Onboarding Status" value={filters.onboarding} onChange={handleFilterChange}>
                <option value="">All Onboarding Status</option>
                <option value="complete">100% Complete</option>
                <option value="pending">Pending Configuration</option>
              </select>
            </div>

            <div>
              <select name="status" className="form-control" style={{ padding: "0.4rem 0.75rem" }} title="Status" value={filters.status} onChange={handleFilterChange}>
                <option value="all">All Statuses</option>
                <option value="active">Active Clients</option>
                <option value="inactive">Inactive / Offboarded</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <select name="industry" className="form-control" style={{ padding: "0.4rem 0.75rem" }} title="Industry" value={filters.industry} onChange={handleFilterChange}>
                <option value="">All Industries</option>
                <option value="Information Technology (IT)">IT</option>
                <option value="Banking, Financial Services & Insurance (BFSI)">BFSI</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Healthcare & Pharmaceuticals">Healthcare</option>
                <option value="Retail & E-Commerce">Retail</option>
                <option value="Automobile">Automobile</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <select name="am" className="form-control" style={{ padding: "0.4rem 0.75rem" }} title="Account Manager" value={filters.am} onChange={handleFilterChange}>
                <option value="">All Account Managers</option>
                <option value="sunita">Sunita Verma</option>
                <option value="rahul">Rahul Desai</option>
                <option value="priya">Priya Kapoor</option>
                <option value="amit">Amit Singh</option>
              </select>
            </div>

            <div title="Coming with Invoicing module">
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", userSelect: "none", opacity: 0.5 }}>
                <input type="checkbox" name="overdue" style={{ width: "16px", height: "16px" }} disabled />
                <span>Show Only Overdue</span>
              </label>
            </div>

            <button className="btn btn-secondary" style={{ padding: "0.4rem 1rem", border: "none", color: "var(--text-muted)" }} onClick={clearFilters}>Clear Filters</button>
          </div>

          {/* Summary Stats Bar */}
          <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", borderLeft: "4px solid var(--primary-navy)", backgroundColor: "var(--bg-light)", display: "flex", gap: "1rem", fontSize: "0.95rem", fontWeight: "600", color: "var(--primary-navy)" }}>
            <span>Total: {stats.total || 0}</span>
            <span style={{ color: "var(--border-color)" }}>|</span>
            <span>Active: {stats.active || 0}</span>
            <span style={{ color: "var(--border-color)" }}>|</span>
            <span style={{ color: "var(--status-warning)" }}>Onboarding: {stats.onboarding || 0}</span>
            <span style={{ color: "var(--border-color)" }}>|</span>
            <span title="Coming with Invoicing module">
              Total Outstanding: <span style={{ color: "var(--status-danger)" }}>—</span>
              {/* SUGGESTION: Replace with real invoice data once the Invoicing module exists */}
            </span>
            <span style={{ color: "var(--border-color)" }}>|</span>
            <span>Total Deployed: {stats.total_deployed || 0} candidates</span>
          </div>

          {/* Clients Table Card */}
          <div className="card" style={{ padding: "0" }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client Details</th>
                    <th>Contract & Billing</th>
                    <th>Onboarding</th>
                    <th>Client Since</th>
                    <th>Last Invoice</th>
                    <th>Outstanding (₹)</th>
                    <th style={{ textAlign: "center" }}>Active Candidates</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataList.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                        No clients match your filters. <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer', textDecoration: 'underline' }}>Clear Filters</button>
                      </td>
                    </tr>
                  ) : (
                    dataList.map(c => (
                      <tr key={c.id} style={c.status === 'suspended' ? { borderLeft: '3px solid var(--status-warning)', opacity: 0.85 } : {}}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div className="client-avatar">{c.company_name?.charAt(0) || 'C'}</div>
                            <div>
                              <Link href={route('clients.show', c.id)} className="client-name">{c.company_name}</Link>
                              <div className="client-meta">
                                <span>{c.client_code}</span>
                                {c.gstin && <span> • GST: {c.gstin}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                            {c.contract_type === 'agency' ? 'Agency Staffing' : c.contract_type === 'eor' ? 'Pass-through EOR' : 'Hybrid'}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {c.billing_model === 'fixed_fee' 
                              ? `Fixed ₹${c.fixed_fee_amount || 0} / Candidate`
                              : `CTC + ${c.markup_percentage || 0}% Markup`}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ width: "30px", height: "4px", backgroundColor: c.status === 'active' ? 'var(--status-success)' : 'var(--status-warning)', borderRadius: "2px" }}></div>
                            <span style={{ fontSize: "0.75rem", color: c.status === 'active' ? 'var(--text-muted)' : 'var(--status-warning)' }}>
                              {c.status === 'active' ? 'Complete' : 'Pending'}
                              {/* SUGGESTION: Replace with real onboarding progress % once added */}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.85rem" }}>Since: {formatDate(c.contract_start_date) || '—'}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {c.contract_end_date ? (
                              new Date(c.contract_end_date) < new Date(Date.now() + 30*24*60*60*1000)
                                ? <span style={{ color: "var(--status-warning)", fontWeight: "600" }}>Expiring Soon</span>
                                : `Ends: ${formatDate(c.contract_end_date)}`
                            ) : 'No End Date'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.85rem" }}>—</div>
                          {/* SUGGESTION: Replace with real invoice data once the Invoicing module exists */}
                        </td>
                        <td style={{ fontWeight: "600" }}>
                          —
                        </td>
                        <td style={{ textAlign: "center", fontSize: "0.9rem", fontWeight: "600" }}>
                          {c.employees_count || 0}
                        </td>
                        <td>
                          <span className={`badge badge-${c.status === 'active' ? 'success' : c.status === 'suspended' ? 'warning' : 'secondary'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <select 
                            className="form-control" 
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem", width: "110px", display: "inline-block" }}
                            onChange={(e) => {
                              const val = e.target.value;
                              e.target.value = ""; 
                              if (val === 'view') router.visit(route('clients.show', c.id));
                              else if (val === 'edit') router.visit(route('clients.edit', c.id));
                              else if (val === 'deactivate') setDeactivateClient(c);
                              else if (val === 'restore') handleRestore(c.id);
                              else if (val === 'delete') setDeleteDialog({ client: c, confirmText: '', reason: '' });
                              else if (val === 'onboard') router.visit(route('employees.create', { client_id: c.id }));
                              else if (val === 'invoice') router.visit(route('invoices.generate', { client_id: c.id }));
                              else if (val) alert("Coming soon: This feature is pending the next phase.");
                            }}
                          >
                            <option value="">-- Actions --</option>
                            <option value="view">View Details</option>
                            <option value="edit">Edit Config</option>
                            <option value="invoice">Generate Invoice</option>
                            <option value="onboard">Onboard Candidate</option>
                            
                            {(c.status === 'active' || c.status === 'onboarding') && (
                              <option value="deactivate">Deactivate Client</option>
                            )}
                            
                            {c.status === 'inactive' && auth.user.role === 'admin' && (
                              <option value="restore">Restore Client</option>
                            )}

                            {auth.user.role === 'admin' && (
                              <option value="delete">Delete Client</option>
                            )}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.links && meta.links.length > 3 && (
              <div className="pagination" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
                <div className="page-info" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {meta.from || 0} to {meta.to || 0} of {meta.total} Clients
                </div>
                <div className="page-controls" style={{ display: 'flex', gap: '0.25rem' }}>
                  {meta.links.map((link, idx) => (
                    <Link
                      key={idx}
                      href={link.url || '#'}
                      className={`page-btn ${link.active ? 'active' : ''}`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                      preserveState
                      disabled={!link.url}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid var(--border-color)',
                        background: link.active ? 'var(--primary-navy)' : 'white',
                        color: link.active ? 'white' : 'var(--text-muted)',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        opacity: !link.url ? 0.5 : 1,
                        pointerEvents: !link.url ? 'none' : 'auto'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <ConfirmDialog
          isOpen={!!deactivateClient}
          title="Deactivate Client"
          message={`Are you sure you want to deactivate ${deactivateClient?.company_name}? Active employees will not be affected, but portal access and billing may be restricted.`}
          onClose={() => setDeactivateClient(null)}
          onConfirm={handleDeactivate}
          confirmLabel="Deactivate"
          variant="warning"
        />

        <ConfirmDialog
          isOpen={!!deleteDialog.client}
          title="Permanently Delete Client"
          message={`WARNING: You are about to permanently delete ${deleteDialog.client?.company_name}. This is a destructive operation.`}
          onClose={() => setDeleteDialog({ client: null, confirmText: '', reason: '' })}
          onConfirm={handleDelete}
          confirmLabel="Permanent Delete"
          variant="danger"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This action will cascade soft-deletes to all branches, contacts, and documents. Portal users will be suspended.
            </p>
            <Input 
              label="Type 'DELETE' to confirm" 
              value={deleteDialog.confirmText} 
              onChange={e => setDeleteDialog(prev => ({ ...prev, confirmText: e.target.value }))}
              placeholder="DELETE"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion (Min 10 chars)</label>
              <textarea 
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                rows="3"
                value={deleteDialog.reason}
                onChange={e => setDeleteDialog(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Contract terminated, offboarding completed..."
              ></textarea>
            </div>
          </div>
        </ConfirmDialog>

      </AuthenticatedLayout>
    </RoleGuard>
  );
}
