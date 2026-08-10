import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Badge from '../../Components/ui/Badge';
import Button from '../../Components/ui/Button';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import DataTable from '../../Components/ui/DataTable';
import Modal from '../../Components/ui/Modal/Modal';
import useToast from '../../Hooks/useToast';
import { Download, RefreshCw, CheckCircle2, AlertTriangle, FileText, ExternalLink, ShieldCheck, Filter, Trash2 } from 'lucide-react';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function ComplianceReports() {
  const { showToast } = useToast();
  const { period, stats, clients, due_dates } = usePage().props;

  // PF ECR Modal & Feature State
  const [isEcrModalOpen, setIsEcrModalOpen] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [runs, setRuns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedBatch, setLastGeneratedBatch] = useState(null);

  // Status Update Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [trrnInput, setTrrnInput] = useState('');
  const [challanInput, setChallanInput] = useState('');
  const [statusSelect, setStatusSelect] = useState('submitted');

  // ESI Monthly Contribution Modal & Feature State
  const [isEsiModalOpen, setIsEsiModalOpen] = useState(false);
  const [esiLoadingRuns, setEsiLoadingRuns] = useState(false);
  const [esiRuns, setEsiRuns] = useState([]);
  const [esiBatches, setEsiBatches] = useState([]);
  const [selectedEsiRunId, setSelectedEsiRunId] = useState('');
  const [esiGenerating, setEsiGenerating] = useState(false);
  const [lastEsiBatch, setLastEsiBatch] = useState(null);
  const [esiError, setEsiError] = useState('');

  const fetchEsiRuns = async () => {
    setEsiLoadingRuns(true);
    try {
      const response = await axios.get(route('compliance.esi_monthly.runs'));
      const fetchedRuns = response.data.runs || [];
      setEsiRuns(fetchedRuns);
      setEsiBatches(response.data.batches || []);
      setSelectedEsiRunId(fetchedRuns.length > 0 ? String(fetchedRuns[0].id) : '');
    } catch (err) {
      showToast('❌ Failed to fetch locked payroll runs for ESI Monthly Contribution.', 'error');
    } finally {
      setEsiLoadingRuns(false);
    }
  };

  useEffect(() => {
    if (isEsiModalOpen) {
      setLastEsiBatch(null);
      setEsiError('');
      fetchEsiRuns();
    }
  }, [isEsiModalOpen]);

  const handleGenerateEsi = async () => {
    if (!selectedEsiRunId) return;
    setEsiGenerating(true);
    setEsiError('');
    try {
      const response = await axios.post(route('compliance.esi_monthly.generate'), {
        payroll_run_id: selectedEsiRunId
      });
      if (response.data.success) {
        showToast('🎉 ESI Monthly Contribution .xls file generated successfully!');
        setLastEsiBatch(response.data);
        fetchEsiRuns();
      }
    } catch (err) {
      const errorList = err.response?.data?.errors?.esi;
      const errorMsg = Array.isArray(errorList) ? errorList.join(' ') : (err.response?.data?.message || 'ESI file generation failed.');
      setEsiError(errorMsg);
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setEsiGenerating(false);
    }
  };

  const fetchEcrRuns = async (selectedMonth = monthFilter) => {
    setLoadingRuns(true);
    try {
      const response = await axios.get(route('compliance.pf_ecr.runs'), {
        params: { month: selectedMonth }
      });
      const fetchedRuns = response.data.runs || [];
      setRuns(fetchedRuns);
      setBatches(response.data.batches || []);
      
      if (fetchedRuns.length > 0) {
        const firstRunId = String(fetchedRuns[0].id);
        setSelectedRunId(firstRunId);
        // Auto-preview first run for instant feedback
        handlePreviewEcr(firstRunId);
      } else {
        setSelectedRunId('');
        setPreviewData(null);
      }
    } catch (err) {
      showToast('❌ Failed to fetch available payroll runs for PF ECR.', 'error');
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    if (isEcrModalOpen) {
      fetchEcrRuns(monthFilter);
    }
  }, [isEcrModalOpen]);

  const handleMonthFilterChange = (newMonth) => {
    setMonthFilter(newMonth);
    fetchEcrRuns(newMonth);
  };

  const handlePreviewEcr = async (runIdToPreview) => {
    const targetRunId = runIdToPreview || selectedRunId;
    if (!targetRunId) {
      showToast('⚠️ Please select a finalized payroll run.', 'error');
      return;
    }
    setPreviewLoading(true);
    setPreviewData(null);
    setLastGeneratedBatch(null);

    try {
      const response = await axios.post(route('compliance.pf_ecr.preview'), {
        payroll_run_id: targetRunId
      });
      setPreviewData(response.data);
      if (response.data.success) {
        showToast('✅ ECR preview generated successfully.');
      } else {
        showToast('⚠️ Validation errors detected in PF ECR data.', 'error');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to preview PF ECR.';
      showToast(`❌ ${errMsg}`, 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateEcr = async () => {
    if (!selectedRunId) return;
    setGenerating(true);
    try {
      const response = await axios.post(route('compliance.pf_ecr.generate'), {
        payroll_run_id: selectedRunId
      });
      if (response.data.success) {
        showToast('🎉 PF ECR .txt file generated/updated successfully!');
        setLastGeneratedBatch(response.data);
        fetchEcrRuns(monthFilter);
      }
    } catch (err) {
      const errorList = err.response?.data?.errors?.ecr;
      const errorMsg = Array.isArray(errorList) ? errorList.join(' ') : (err.response?.data?.message || 'ECR generation failed.');
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefreshSingleUser = async (emp) => {
    showToast(`🔄 Refreshing calculation & details for employee ${emp.member_name} (${emp.employee_code})...`, 'info');
    await handlePreviewEcr(selectedRunId);
  };

  const handleSoftDeleteBatch = async (batch) => {
    if (!window.confirm(`Are you sure you want to soft-delete PF ECR Batch #ECR-${batch.id}?`)) {
      return;
    }
    try {
      await axios.delete(route('compliance.pf_ecr.destroy', batch.id));
      showToast(`🗑️ Batch #ECR-${batch.id} has been soft-deleted.`, 'info');
      fetchEcrRuns(monthFilter);
    } catch (err) {
      showToast('❌ Failed to delete ECR batch.', 'error');
    }
  };

  const openStatusUpdate = (batch) => {
    setEditingBatch(batch);
    setTrrnInput(batch.trrn || '');
    setChallanInput(batch.challan_number || '');
    setStatusSelect(batch.status || 'submitted');
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!editingBatch) return;
    try {
      await axios.post(route('compliance.pf_ecr.update_status', editingBatch.id), {
        status: statusSelect,
        trrn: trrnInput,
        challan_number: challanInput,
        sync_compliance_filings: true
      });
      showToast('✅ PF ECR filing status updated successfully.');
      setIsStatusModalOpen(false);
      fetchEcrRuns(monthFilter);
      router.reload({ preserveScroll: true });
    } catch (err) {
      showToast('❌ Failed to update filing status.', 'error');
    }
  };

  const markFiled = (clientId, statute, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'filed' : 'pending';
    router.post(route('compliance.mark_filed'), {
      client_id: clientId,
      statute: statute,
      period: period,
      status: newStatus
    }, {
      preserveScroll: true
    });
  };

  const reportsData = [
    { 
      id: 'pf_ecr',
      title: 'Provident Fund ECR', 
      badge: 'Form 5/10', 
      color: 'success', 
      desc: 'Generates Electronic Challan cum Return (ECR) for EPFO portal upload. Compiles employee 12% and employer 12% contributions.', 
      action: 'PF ECR Text File', 
      btnText: 'Generate ECR (.txt)',
      isFunctional: true
    },
    { id: 'esi', title: 'ESI Monthly File', badge: 'ESIC Portal', color: 'success', desc: 'Monthly contribution file for ESI-eligible employees from locked payroll data. Standard 6-column ESIC bulk upload sheet (Excel 97-2003, no header).', action: 'ESI Contribution Excel', btnText: 'Generate ESI (.xls)', isFunctional: true },
    { id: 'pt', title: 'PT Challan Summary', badge: 'State-wise', color: 'warning', desc: 'Aggregates Professional Tax deductions across all applicable state slabs based on employee work locations.', action: 'PT State-wise Challans', btnText: 'Generate PT Summary (.pdf)', isFunctional: false },
    { id: 'tds', title: 'TDS Form 24Q', badge: 'Quarterly', color: 'info', desc: 'Generates consolidated Annexure-II salary and tax declaration data for quarterly income tax filings.', action: 'TDS Q1 Return Dataset', btnText: 'Generate Form 24Q (.csv)', isFunctional: false },
    { id: 'gstr1', title: 'GSTR-1 Summary', badge: 'Monthly', color: 'neutral', desc: 'Extracts outward supplies and agency service invoice summaries for GST filing (B2B transactions).', action: 'GSTR-1 Export', btnText: 'Export GSTR-1 (.csv)', isFunctional: false },
    { id: 'audit', title: 'Client Audit Pack', badge: 'Consolidated', color: 'neutral', desc: 'Generates a complete compliance zip file per client including PF/ESI challan copies and registers.', action: 'Consolidated Client Audit Pack', btnText: 'Generate Audit Pack (.zip)', isFunctional: false }
  ];

  const renderStatus = (clientId, statute, statusVal) => {
    const isPending = statusVal === 'pending';
    const variant = isPending ? 'danger' : 'success';
    const displayVal = isPending ? 'Pending' : 'Filed';
    return (
      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => markFiled(clientId, statute, statusVal)}>
        <Badge variant={variant}>{displayVal}</Badge>
        <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {isPending ? 'Mark Filed' : 'Unmark'}
        </span>
      </div>
    );
  };

  const tableColumns = [
    { key: 'name', label: 'Client Name', render: val => <strong>{val}</strong> },
    { key: 'headcount', label: 'Headcount' },
    { key: 'pf', label: 'PF Status', render: (_, row) => renderStatus(row.id, 'pf', row.filings?.pf?.status) },
    { key: 'esi', label: 'ESI Status', render: (_, row) => renderStatus(row.id, 'esi', row.filings?.esi?.status) },
    { key: 'pt', label: 'PT Status', render: (_, row) => renderStatus(row.id, 'pt', row.filings?.pt?.status) },
    { key: 'tds', label: 'TDS Status', render: (_, row) => renderStatus(row.id, 'tds', row.filings?.tds?.status) },
    { key: 'clra', label: 'CLRA Status', render: (_, row) => renderStatus(row.id, 'clra', row.filings?.clra?.status) },
    { key: 'due', label: 'Next Due', render: (_, row) => (
      <div className="text-xs text-gray-500">
        <div>PF: {row.filings?.pf?.due_date}</div>
        <div>PT: {row.filings?.pt?.due_date}</div>
      </div>
    ) },
    { key: 'action', label: 'Action', render: (_, row) => (
      <Button variant="secondary" size="xs" onClick={() => showToast(`ℹ️ Opening compliance register for ${row.name}...`)}>View</Button>
    ) }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="compliance">
      <AuthenticatedLayout>
        <Head title="Statutory Compliance Center" />
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Statutory Compliance Center</h2>
            <p className="text-gray-500 text-sm">PF, ESI, PT, LWF, TDS Returns & Challans</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" icon={Download} onClick={() => showToast('Downloading pending reports summary...')}>Download Pending</Button>
            <Button variant="primary" icon={RefreshCw} onClick={() => router.reload({ preserveScroll: true })}>Sync Status</Button>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 border-l-4 border-l-green-600 p-4 rounded-md mb-6 flex items-start gap-3">
          <CheckCircle2 className="text-green-700 w-6 h-6 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-bold text-green-800 mb-1">Finalized Payroll Compliance Available</div>
            <div className="text-xs text-green-700">Official 11-field EPFO Provident Fund ECR text file generation is enabled for all approved and locked payroll runs.</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mb-8">
          <div className="flex-1 min-w-[300px] bg-gradient-to-br from-blue-900 to-slate-800 text-white p-6 rounded-md shadow flex items-center gap-6">
            <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center text-2xl font-bold">
              {stats?.completed_filings}/{stats?.total_filings}
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Overall Compliance</h3>
              <p className="text-sm opacity-90 m-0">Standing: {stats?.completed_filings} of {stats?.total_filings} required filings completed.</p>
            </div>
          </div>
          
          <div className="flex-1 bg-white border border-gray-200 rounded-md p-4 text-center">
            <h3 className="text-2xl font-bold text-blue-900">{stats?.total_filings}</h3>
            <p className="text-xs text-gray-500 font-bold uppercase mt-1 m-0">Total Required Filings</p>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-md p-4 text-center">
            <h3 className="text-2xl font-bold text-red-600">{stats?.pending_filings}</h3>
            <p className="text-xs text-gray-500 font-bold uppercase mt-1 m-0">Pending Actions</p>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-md p-4 text-center">
            <h3 className="text-2xl font-bold text-cyan-600">{stats?.completed_filings}</h3>
            <p className="text-xs text-gray-500 font-bold uppercase mt-1 m-0">Returns Filed This Month</p>
          </div>
        </div>

        <h3 className="text-lg font-bold text-blue-900 mb-4">Upcoming Statutory Due Dates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
          {[
            { date: due_dates?.pf, title: 'PF & ESI Filing', badge: '15th', color: 'danger' },
            { date: due_dates?.pt, title: 'Professional Tax', badge: 'Earliest', color: 'warning' },
            { date: due_dates?.tds, title: 'TDS (Form 24Q)', badge: 'Quarterly', color: 'info' },
            { date: 'Depends on Client', title: 'CLRA License', badge: 'Varies', color: 'neutral' },
          ].map((alert, i) => (
            <div key={i} className={`bg-white border-l-4 p-4 rounded shadow-sm ${alert.color === 'danger' ? 'border-l-red-600' : alert.color === 'warning' ? 'border-l-amber-500' : 'border-l-cyan-500'}`}>
              <div className="text-xs text-gray-500 font-bold uppercase">{alert.date}</div>
              <div className="font-semibold text-sm text-gray-900 my-2">{alert.title}</div>
              <Badge variant={alert.color}>{alert.badge}</Badge>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-bold text-blue-900 mb-4">Generate Statutory Reports & Returns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {reportsData.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-md p-5 flex flex-col hover:shadow-md hover:border-amber-500 transition-all duration-200">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-blue-900 text-base m-0">{report.title}</h4>
                <Badge variant={report.color}>{report.badge}</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-5 flex-1">{report.desc}</p>
              <div className="mt-auto">
                {report.isFunctional ? (
                  <Button
                    variant="navy"
                    className="w-full justify-center bg-blue-900 hover:bg-blue-800 text-white font-bold"
                    onClick={() => report.id === 'esi' ? setIsEsiModalOpen(true) : setIsEcrModalOpen(true)}
                  >
                    {report.btnText}
                  </Button>
                ) : (
                  <Button variant="navy" className="w-full justify-center" disabled>
                    {report.btnText} (Coming Soon)
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-blue-900 m-0 mb-4">Client-wise Compliance Register</h3>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <DataTable columns={tableColumns} data={clients} keyField="id" />
          </div>
        </Card>

        {/* PF ECR GENERATION MODAL */}
        <Modal
          isOpen={isEcrModalOpen}
          onClose={() => setIsEcrModalOpen(false)}
          title="Provident Fund ECR Generation (Official EPFO .txt)"
          size="xl"
          footer={
            <div className="flex justify-between w-full items-center">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Read-only reader of approved/locked payroll data
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsEcrModalOpen(false)}>Close</Button>
                {previewData?.success && (
                  <Button 
                    variant="primary" 
                    className="bg-green-700 hover:bg-green-800 font-bold"
                    onClick={handleGenerateEcr}
                    disabled={generating}
                  >
                    {generating ? 'Generating File...' : 'Generate & Download ECR (.txt)'}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Step 1: Select Payroll Run & Filters */}
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-md space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-blue-900 m-0">Step 1: Select Approved/Locked Payroll Run</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Filter Month:</span>
                  <select 
                    value={monthFilter}
                    onChange={(e) => handleMonthFilterChange(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white font-medium focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Finalized Months</option>
                    <option value={period}>{period} (Current Dashboard Month)</option>
                    <option value="2026-07">2026-07 (July 2026)</option>
                    <option value="2026-06">2026-06 (June 2026)</option>
                  </select>
                </div>
              </div>

              {loadingRuns ? (
                <div className="text-xs text-gray-500">Loading finalized payroll runs...</div>
              ) : runs.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                  No approved or locked payroll runs found for month range: <strong>{monthFilter === 'all' ? 'All Months' : monthFilter}</strong>. Please verify that the payroll run has been approved or locked in the Payroll Approval module.
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[280px]">
                    <Select
                      label="Select Payroll Run"
                      value={selectedRunId}
                      onChange={(e) => {
                        setSelectedRunId(e.target.value);
                        handlePreviewEcr(e.target.value);
                      }}
                      options={runs.map(r => ({
                        value: String(r.id),
                        label: `${r.client_name} — Run ${r.run_code} (${r.payroll_month}) [${r.status.toUpperCase()}]`
                      }))}
                      noMargin
                    />
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={() => handlePreviewEcr(selectedRunId)}
                    disabled={previewLoading || !selectedRunId}
                  >
                    {previewLoading ? 'Validating...' : 'Refresh Preview'}
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2: Validation Errors Drawer */}
            {previewData && !previewData.success && (
              <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-4 rounded-md">
                <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  ECR Generation Blocked — Data Validation Errors Found
                </div>
                <p className="text-xs text-red-700 mb-3">The following mandatory EPFO fields are missing or invalid in your payroll/employee setup. Please correct these records before generating the official return:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-red-800 max-h-48 overflow-y-auto">
                  {previewData.errors?.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 3: Financial Summary & Employee Preview Table */}
            {previewData?.summary && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-blue-900">Step 2: Reconciled ECR Financial Summary</h4>
                  <Badge variant="success">PF Est Code: {previewData.summary.pf_establishment_code}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded text-center">
                    <div className="text-xl font-bold text-blue-900">{previewData.summary.employee_count}</div>
                    <div className="text-xs font-semibold text-blue-700 uppercase">PF Employees</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-center">
                    <div className="text-xl font-bold text-emerald-900">₹{Number(previewData.summary.total_epf_wages).toLocaleString('en-IN')}</div>
                    <div className="text-xs font-semibold text-emerald-700 uppercase">Total EPF Wages</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded text-center">
                    <div className="text-xl font-bold text-indigo-900">₹{Number(previewData.summary.total_employee_epf).toLocaleString('en-IN')}</div>
                    <div className="text-xs font-semibold text-indigo-700 uppercase">Employee EPF (12%)</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded text-center">
                    <div className="text-xl font-bold text-purple-900">₹{Number(previewData.summary.total_employer_epf).toLocaleString('en-IN')}</div>
                    <div className="text-xs font-semibold text-purple-700 uppercase">Employer EPF Share</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-gray-50 p-3 rounded border border-gray-200">
                  <div><strong>Total EPS Wages:</strong> ₹{Number(previewData.summary.total_eps_wages).toLocaleString('en-IN')}</div>
                  <div><strong>Employer EPS (8.33%):</strong> ₹{Number(previewData.summary.total_employer_eps).toLocaleString('en-IN')}</div>
                  <div><strong>Total NCP Days:</strong> {previewData.summary.total_ncp_days} Days</div>
                </div>

                {/* SINGLE USER ACTION PREVIEW TABLE */}
                {previewData?.line_items && previewData.line_items.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <h5 className="font-bold text-xs text-blue-900 uppercase tracking-wide">Employee Line Items Breakdown ({previewData.line_items.length})</h5>
                      <span className="text-[11px] text-gray-500">Single-user verification & refresh available in Action</span>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded max-h-56 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-gray-700 font-bold sticky top-0 border-b">
                          <tr>
                            <th className="p-2">Code</th>
                            <th className="p-2">Employee Name</th>
                            <th className="p-2">UAN</th>
                            <th className="p-2">EPF Wages</th>
                            <th className="p-2">EE EPF</th>
                            <th className="p-2">ER EPF</th>
                            <th className="p-2">EPS</th>
                            <th className="p-2">NCP</th>
                            <th className="p-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.line_items.map((emp, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50">
                              <td className="p-2 font-mono">{emp.employee_code}</td>
                              <td className="p-2 font-semibold text-gray-900">{emp.member_name}</td>
                              <td className="p-2 font-mono text-gray-600">{emp.uan}</td>
                              <td className="p-2">₹{Number(emp.epf_wages).toLocaleString('en-IN')}</td>
                              <td className="p-2 font-semibold text-indigo-700">₹{Number(emp.ee_epf).toLocaleString('en-IN')}</td>
                              <td className="p-2 font-semibold text-purple-700">₹{Number(emp.er_epf).toLocaleString('en-IN')}</td>
                              <td className="p-2">₹{Number(emp.eps_contribution).toLocaleString('en-IN')}</td>
                              <td className="p-2">{emp.ncp_days}</td>
                              <td className="p-2 flex items-center gap-2">
                                <button 
                                  onClick={() => handleRefreshSingleUser(emp)}
                                  className="text-amber-700 hover:text-amber-900 font-bold underline flex items-center gap-1 text-[11px]"
                                  title={`Regenerate / refresh PF calculation preview for ${emp.member_name}`}
                                >
                                  <RefreshCw className="w-3 h-3" /> Regenerate
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generated Batch Success Stream */}
            {lastGeneratedBatch && (
              <div className="bg-green-50 border border-green-300 p-4 rounded-md text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <h4 className="font-bold text-base text-green-900">PF ECR File Created & Verified</h4>
                <p className="text-xs text-green-800">Generated file: <strong>{lastGeneratedBatch.file_name}</strong></p>
                <div className="flex justify-center gap-3">
                  <a 
                    href={lastGeneratedBatch.download_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                  >
                    <Download className="w-4 h-4" /> Download .TXT Return File
                  </a>
                </div>
                <p className="text-[11px] text-gray-500 italic mt-2">
                  Upload the downloaded file directly to the official EPFO Unified Portal (https://unifiedportal-emp.epfindia.gov.in/).
                </p>
              </div>
            )}

            {/* ECR History / Batches Table */}
            {batches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-sm text-blue-900">PF ECR Filing Batch History</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-2">Batch #</th>
                        <th className="p-2">Client</th>
                        <th className="p-2">Month</th>
                        <th className="p-2">EE EPF</th>
                        <th className="p-2">ER EPF</th>
                        <th className="p-2">TRRN / Challan</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(b => (
                        <tr key={b.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-mono">#ECR-{b.id}</td>
                          <td className="p-2">{b.client?.company_name || 'N/A'}</td>
                          <td className="p-2">{b.wage_month ? b.wage_month.substring(0, 7) : ''}</td>
                          <td className="p-2">₹{Number(b.total_employee_epf).toLocaleString('en-IN')}</td>
                          <td className="p-2">₹{Number(b.total_employer_epf).toLocaleString('en-IN')}</td>
                          <td className="p-2 font-mono">{b.trrn || b.challan_number || '—'}</td>
                          <td className="p-2"><Badge variant={b.status === 'filed' ? 'success' : 'info'}>{b.status}</Badge></td>
                          <td className="p-2 flex items-center gap-2">
                            <a 
                              href={route('compliance.pf_ecr.download', b.id)} 
                              className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                              title="Download .TXT Return File"
                            >
                              <Download className="w-3.5 h-3.5" /> TXT
                            </a>
                            <button 
                              onClick={() => openStatusUpdate(b)} 
                              className="text-gray-600 hover:text-blue-900 underline font-bold"
                            >
                              Status
                            </button>
                            <button 
                              onClick={() => handleSoftDeleteBatch(b)} 
                              className="text-red-600 hover:text-red-800 font-bold underline flex items-center gap-0.5 ml-1"
                              title="Soft delete this ECR filing batch record"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* STATUS UPDATE MODAL */}
        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title={`Update Filing Status for ECR Batch #${editingBatch?.id}`}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveStatus}>Save Filing Status</Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <Select
              label="Filing Lifecycle Status"
              value={statusSelect}
              onChange={(e) => setStatusSelect(e.target.value)}
              options={[
                { value: 'generated', label: 'Generated' },
                { value: 'downloaded', label: 'Downloaded' },
                { value: 'submitted', label: 'Submitted to EPFO Portal' },
                { value: 'accepted', label: 'Accepted by EPFO' },
                { value: 'filed', label: 'Filed & Paid (Finalized)' },
                { value: 'rejected', label: 'Rejected by Portal' },
              ]}
            />
            <Input
              label="TRRN (Temporary Return Reference Number)"
              value={trrnInput}
              onChange={(e) => setTrrnInput(e.target.value)}
              placeholder="e.g. TRRN 1012608123456"
            />
            <Input
              label="Challan / Payment Reference Number"
              value={challanInput}
              onChange={(e) => setChallanInput(e.target.value)}
              placeholder="e.g. CHN-2026-08-9999"
            />
          </div>
        </Modal>

        {/* ESI MONTHLY CONTRIBUTION MODAL */}
        <Modal
          isOpen={isEsiModalOpen}
          onClose={() => setIsEsiModalOpen(false)}
          title="ESI Monthly Contribution (.xls)"
          size="lg"
          footer={
            <div className="flex justify-between w-full items-center">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Read-only reader of locked payroll data only
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsEsiModalOpen(false)}>Close</Button>
                <Button
                  variant="primary"
                  className="bg-green-700 hover:bg-green-800 font-bold"
                  onClick={handleGenerateEsi}
                  disabled={esiGenerating || !selectedEsiRunId}
                >
                  {esiGenerating ? 'Generating File...' : 'Generate & Download ESI (.xls)'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-md space-y-3">
              <h4 className="font-bold text-sm text-blue-900 m-0">Select Locked Payroll Run</h4>
              {esiLoadingRuns ? (
                <div className="text-xs text-gray-500">Loading locked payroll runs...</div>
              ) : esiRuns.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                  No locked payroll runs found. ESI Monthly Contribution can only be generated from a payroll run whose status is LOCKED.
                </div>
              ) : (
                <Select
                  label="Select Payroll Run"
                  value={selectedEsiRunId}
                  onChange={(e) => setSelectedEsiRunId(e.target.value)}
                  options={esiRuns.map(r => ({
                    value: String(r.id),
                    label: `${r.client_name} — Run ${r.run_code} (${r.payroll_month}) [LOCKED]`
                  }))}
                  noMargin
                />
              )}
            </div>

            {esiError && (
              <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-4 rounded-md text-xs text-red-800">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> Generation Blocked
                </div>
                {esiError}
              </div>
            )}

            {lastEsiBatch && (
              <div className="bg-green-50 border border-green-300 p-4 rounded-md text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <h4 className="font-bold text-base text-green-900">ESI Monthly Contribution File Created</h4>
                <p className="text-xs text-green-800">
                  Generated file: <strong>{lastEsiBatch.file_name}</strong> — {lastEsiBatch.employee_count} eligible employee(s), total wages ₹{Number(lastEsiBatch.total_wages).toLocaleString('en-IN')}
                </p>
                <a
                  href={lastEsiBatch.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                >
                  <Download className="w-4 h-4" /> Download .XLS File
                </a>
              </div>
            )}

            {esiBatches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-sm text-blue-900">ESI Monthly Generation History</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-2">Batch #</th>
                        <th className="p-2">Client</th>
                        <th className="p-2">Month</th>
                        <th className="p-2">Employees</th>
                        <th className="p-2">Total Wages</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {esiBatches.map(b => (
                        <tr key={b.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-mono">#ESI-{b.id}</td>
                          <td className="p-2">{b.client?.company_name || 'N/A'}</td>
                          <td className="p-2">{b.wage_month ? b.wage_month.substring(0, 7) : ''}</td>
                          <td className="p-2">{b.employee_count}</td>
                          <td className="p-2">₹{Number(b.total_wages).toLocaleString('en-IN')}</td>
                          <td className="p-2"><Badge variant={b.status === 'downloaded' ? 'success' : 'info'}>{b.status}</Badge></td>
                          <td className="p-2">
                            <a
                              href={route('compliance.esi_monthly.download', b.id)}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                              title="Download .XLS File"
                            >
                              <Download className="w-3.5 h-3.5" /> XLS
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
