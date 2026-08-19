import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoleGuard from '@/Components/RoleGuard';
import useToast from '@/Hooks/useToast';
import Modal from '@/Components/ui/Modal';
import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import Badge from '@/Components/ui/Badge';
import { 
  Building2, CalendarDays, FileText, Banknote, UserX, MessageSquare,
  CheckSquare, Briefcase, BarChart3, Plus, Search, Edit3, CheckCircle2,
  XCircle, ToggleLeft, ToggleRight, Layers, Sliders
} from 'lucide-react';
import './MasterManagement.css';

const ICON_MAP = {
  Building2,
  CalendarDays,
  FileText,
  Banknote,
  UserX,
  MessageSquare,
  CheckSquare,
  Briefcase,
  BarChart3
};

export default function MasterManagement({ active_key, items = {}, registry = {}, schema = {} }) {
  const { showToast } = useToast();
  const itemList = Array.isArray(items) ? items : (items.data || []);
  const paginationMeta = !Array.isArray(items) && items.total !== undefined ? items : null;

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  const activeRegistryItem = registry[active_key] || { label: 'Master Data', key: active_key };

  const handleTabChange = (key) => {
    setSearchTerm('');
    router.get(route('admin.masters.index'), { key }, { preserveState: false });
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      router.get(route('admin.masters.index'), { key: active_key, search: searchTerm }, { preserveState: true, preserveScroll: true });
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const initial = {};
    schema.fields?.forEach(field => {
      if (field === 'is_active') initial[field] = true;
      else if (field === 'sort_order') initial[field] = (items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1);
      else if (field === 'is_paid') initial[field] = true;
      else if (field === 'triggers_forfeiture_review') initial[field] = false;
      else initial[field] = '';
    });
    setFormData(initial);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    const initial = {};
    schema.fields?.forEach(field => {
      initial[field] = item[field] !== undefined ? item[field] : '';
    });
    setFormData(initial);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleToggleActive = (item) => {
    router.post(route('admin.masters.toggle', { key: active_key, id: item.id }), {}, {
      preserveScroll: true,
      onSuccess: () => {
        showToast({ message: `${item.name} status updated`, type: 'success' });
      },
      onError: (err) => {
        showToast({ message: 'Failed to update status', type: 'error' });
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setProcessing(true);
    setFormErrors({});

    const isEdit = !!editingItem;
    const url = isEdit 
      ? route('admin.masters.update', { key: active_key, id: editingItem.id })
      : route('admin.masters.store', { key: active_key });

    const method = isEdit ? 'put' : 'post';

    router[method](url, formData, {
      preserveScroll: true,
      onSuccess: () => {
        setProcessing(false);
        setModalOpen(false);
        showToast({ message: `Master record ${isEdit ? 'updated' : 'created'} successfully!`, type: 'success' });
      },
      onError: (errs) => {
        setProcessing(false);
        setFormErrors(errs);
        showToast({ message: 'Please resolve form errors.', type: 'error' });
      }
    });
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="admin">
      <AuthenticatedLayout>
        <Head title="Master Data Management" />

        <div className="master-header">
          <div>
            <div className="master-header-badge">
              <Layers size={14} /> Master Data Management
            </div>
            <h2>Enterprise Reference Masters</h2>
            <p>Configure &amp; manage system lookup tables (`mas_` prefixed tables) by strict primary key ID.</p>
          </div>
          <div>
            <Button variant="navy" onClick={handleOpenAddModal} className="gap-2">
              <Plus size={16} /> Add New {activeRegistryItem.label.slice(0, -1)}
            </Button>
          </div>
        </div>

        <div className="master-layout">
          {/* Left Navigation Sidebar */}
          <div className="master-sidebar">
            <div className="master-sidebar-title">
              <Sliders size={15} /> Select Master Category
            </div>
            <div className="master-sidebar-list">
              {Object.keys(registry).map(key => {
                const reg = registry[key];
                const IconComp = ICON_MAP[reg.icon] || Layers;
                const isActive = active_key === key;
                return (
                  <div 
                    key={key} 
                    className={`master-sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabChange(key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="master-sidebar-icon">
                        <IconComp size={16} />
                      </div>
                      <span className="master-sidebar-label">{reg.label}</span>
                    </div>
                    <span className="master-sidebar-badge">{reg.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="master-content">
            <div className="master-card">
              {/* Card Header & Search */}
              <div className="master-card-header">
                <div>
                  <h3>{activeRegistryItem.label}</h3>
                  <span className="master-card-subtitle">
                    Table: <code>mas_{active_key}</code> ({paginationMeta ? paginationMeta.total : itemList.length} records)
                  </span>
                </div>
                <div className="master-search-box">
                  <Search size={16} className="text-gray-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder={`Search ${activeRegistryItem.label} (Press Enter)...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchSubmit}
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="master-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>ID</th>
                      <th>Display Name</th>
                      {schema.fields?.includes('code') && <th>Code</th>}
                      {schema.fields?.includes('slug') && <th>Slug</th>}
                      {schema.fields?.includes('exit_type_category') && <th>Exit Category</th>}
                      {schema.fields?.includes('triggers_forfeiture_review') && <th>Forfeiture Flag</th>}
                      {schema.fields?.includes('target_entity') && <th>Target Entity</th>}
                      {schema.fields?.includes('default_department') && <th>Department</th>}
                      {schema.fields?.includes('department_name') && <th>Department</th>}
                      {schema.fields?.includes('category') && <th>Category</th>}
                      {schema.fields?.includes('is_paid') && <th>Paid Leave?</th>}
                      {schema.fields?.includes('default_accrual') && <th>Accrual / Mo</th>}
                      <th style={{ width: '80px' }}>Order</th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemList.length > 0 ? (
                      itemList.map(item => (
                        <tr key={item.id} className={!item.is_active ? 'opacity-60 bg-slate-50' : ''}>
                          <td className="font-mono text-xs text-gray-500">#{item.id}</td>
                          <td className="font-semibold text-slate-800">
                            {item.icon && <span className="mr-2">{item.icon}</span>}
                            {item.name}
                          </td>
                          {schema.fields?.includes('code') && <td><code className="text-xs">{item.code}</code></td>}
                          {schema.fields?.includes('slug') && <td><code className="text-xs">{item.slug}</code></td>}
                          {schema.fields?.includes('exit_type_category') && (
                            <td>
                              <Badge type="info">{item.exit_type_category}</Badge>
                            </td>
                          )}
                          {schema.fields?.includes('triggers_forfeiture_review') && (
                            <td>
                              {item.triggers_forfeiture_review ? (
                                <Badge type="danger">⚖️ Forfeiture Review</Badge>
                              ) : (
                                <span className="text-xs text-gray-400">Standard</span>
                              )}
                            </td>
                          )}
                          {schema.fields?.includes('target_entity') && (
                            <td>
                              <Badge type="neutral">{item.target_entity}</Badge>
                            </td>
                          )}
                          {schema.fields?.includes('default_department') && <td>{item.default_department}</td>}
                          {schema.fields?.includes('department_name') && <td>{item.department_name || 'General'}</td>}
                          {schema.fields?.includes('category') && <td>{item.category}</td>}
                          {schema.fields?.includes('is_paid') && (
                            <td>
                              {item.is_paid ? <Badge type="success">Paid</Badge> : <Badge type="warning">Unpaid</Badge>}
                            </td>
                          )}
                          {schema.fields?.includes('default_accrual') && (
                            <td>{item.default_accrual} days</td>
                          )}
                          <td>
                            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{item.sort_order}</span>
                          </td>
                          <td>
                            <button 
                              type="button" 
                              className={`status-toggle-btn ${item.is_active ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleActive(item)}
                              title="Click to toggle status"
                            >
                              {item.is_active ? (
                                <><CheckCircle2 size={13} /> Active</>
                              ) : (
                                <><XCircle size={13} /> Inactive</>
                              )}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              type="button" 
                              className="edit-btn"
                              onClick={() => handleOpenEditModal(item)}
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="12" className="text-center py-8 text-gray-400">
                          No records found matching search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {paginationMeta && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                    Showing <strong>{paginationMeta.from || 0}</strong> to <strong>{paginationMeta.to || 0}</strong> of <strong>{paginationMeta.total || 0}</strong> records
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {paginationMeta.links?.map((link, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={!link.url || link.active}
                        onClick={() => {
                          if (link.url) {
                            router.get(link.url, {}, { preserveState: true, preserveScroll: true });
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: link.active ? '700' : '500',
                          backgroundColor: link.active ? '#1F3864' : '#FFFFFF',
                          color: link.active ? '#FFFFFF' : '#475569',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          cursor: link.url && !link.active ? 'pointer' : 'default',
                          opacity: !link.url ? 0.5 : 1,
                        }}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal for Add / Edit */}
        <Modal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
          title={`${editingItem ? 'Edit' : 'Add New'} ${activeRegistryItem.label.slice(0, -1)}`}
        >
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Name <span className="text-red-500">*</span></label>
              <Input 
                value={formData.name || ''} 
                onChange={e => {
                  const val = e.target.value;
                  const newFormData = { ...formData, name: val };
                  if (!editingItem) {
                    if (schema.fields?.includes('slug')) {
                      newFormData.slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    }
                    if (schema.fields?.includes('code')) {
                      newFormData.code = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^-|-$)+/g, '');
                    }
                  }
                  setFormData(newFormData);
                }}
                placeholder="Enter name"
                required
              />
              {formErrors.name && <div className="text-red-500 text-xs mt-1">{formErrors.name}</div>}
            </div>

            {schema.fields?.includes('code') && (
              <div>
                <label className="block text-sm font-semibold mb-1">System Code <span className="text-slate-400 font-normal">(Auto-generated if empty)</span></label>
                <Input 
                  value={formData.code || ''} 
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. unique_code"
                />
                {formErrors.code && <div className="text-red-500 text-xs mt-1">{formErrors.code}</div>}
              </div>
            )}

            {schema.fields?.includes('slug') && (
              <div>
                <label className="block text-sm font-semibold mb-1">URL / Key Slug <span className="text-slate-400 font-normal">(Auto-generated if empty)</span></label>
                <Input 
                  value={formData.slug || ''} 
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. industry-slug"
                />
                {formErrors.slug && <div className="text-red-500 text-xs mt-1">{formErrors.slug}</div>}
              </div>
            )}

            {schema.fields?.includes('exit_type_category') && (
              <div>
                <label className="block text-sm font-semibold mb-1">Exit Category <span className="text-red-500">*</span></label>
                <Select 
                  value={formData.exit_type_category || 'Resignation'}
                  onChange={e => setFormData({ ...formData, exit_type_category: e.target.value })}
                >
                  <option value="Resignation">Resignation</option>
                  <option value="Termination">Termination</option>
                  <option value="End of Contract">End of Contract</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Client-Initiated">Client-Initiated</option>
                </Select>
              </div>
            )}

            {schema.fields?.includes('triggers_forfeiture_review') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-900 text-sm">
                  <input 
                    type="checkbox"
                    checked={!!formData.triggers_forfeiture_review}
                    onChange={e => setFormData({ ...formData, triggers_forfeiture_review: e.target.checked })}
                    className="accent-red-600"
                  />
                  <span>Triggers Gratuity Forfeiture Legal Review (Sec 4(6))</span>
                </label>
                <p className="text-xs text-red-700 mt-1 ml-5">
                  Check ONLY for grounds involving riotous, violent conduct or offenses of moral turpitude.
                </p>
              </div>
            )}

            {schema.fields?.includes('target_entity') && (
              <div>
                <label className="block text-sm font-semibold mb-1">Target Entity</label>
                <Select 
                  value={formData.target_entity || 'both'}
                  onChange={e => setFormData({ ...formData, target_entity: e.target.value })}
                >
                  <option value="client">Client Documents</option>
                  <option value="employee">Employee Documents</option>
                  <option value="both">Both Client &amp; Employee</option>
                </Select>
              </div>
            )}

            {schema.fields?.includes('default_department') && (
              <div>
                <label className="block text-sm font-semibold mb-1">Default Department Owner</label>
                <Input 
                  value={formData.default_department || ''} 
                  onChange={e => setFormData({ ...formData, default_department: e.target.value })}
                  placeholder="e.g. IT Support / HR"
                />
              </div>
            )}

            {schema.fields?.includes('department_name') && (
              <div>
                <label className="block text-sm font-semibold mb-1">Department</label>
                <Input 
                  value={formData.department_name || ''} 
                  onChange={e => setFormData({ ...formData, department_name: e.target.value })}
                  placeholder="e.g. Engineering"
                />
              </div>
            )}

            {schema.fields?.includes('category') && (
              <div>
                <label className="block text-sm font-semibold mb-1">Category</label>
                <Input 
                  value={formData.category || ''} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Payroll / Statutory"
                />
              </div>
            )}

            {schema.fields?.includes('is_paid') && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                  <input 
                    type="checkbox"
                    checked={!!formData.is_paid}
                    onChange={e => setFormData({ ...formData, is_paid: e.target.checked })}
                    className="accent-[#1F3864]"
                  />
                  <span>Is Paid Leave Type?</span>
                </label>
              </div>
            )}

            {schema.fields?.includes('default_accrual') && (
              <div>
                <label className="block text-sm font-semibold mb-1">Monthly Accrual Days</label>
                <Input 
                  type="number"
                  step="0.1"
                  value={formData.default_accrual || 0} 
                  onChange={e => setFormData({ ...formData, default_accrual: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1">Sort Order</label>
              <Input 
                type="number"
                value={formData.sort_order || 1} 
                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 1 })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="navy" disabled={processing}>
                {processing ? 'Saving...' : 'Save Master Record'}
              </Button>
            </div>
          </form>
        </Modal>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
