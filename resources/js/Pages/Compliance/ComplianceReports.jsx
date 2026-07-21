import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Badge from '../../Components/ui/Badge';
import Button from '../../Components/ui/Button';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import DataTable from '../../Components/ui/DataTable';
import Pagination from '../../Components/ui/Pagination';
import useToast from '../../Hooks/useToast';
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react';

import { router, usePage } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ComplianceReports() {
  const { showToast } = useToast();
  const { period, stats, clients, due_dates } = usePage().props;
  
  const generateReport = (name) => {
    showToast(`✅ Generated ${name} successfully. Download started.`);
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
    { title: 'Provident Fund ECR', badge: 'Form 5/10', color: 'success', desc: 'Generates Electronic Challan cum Return (ECR) for EPFO portal upload. Compiles employee 12% and employer 12% contributions.', action: 'PF ECR Text File', btnText: 'Generate ECR (.txt)' },
    { title: 'ESI Monthly File', badge: 'ESIC Portal', color: 'success', desc: 'Monthly contribution file for employees earning gross ≤ ₹21,000. Formats standard bulk upload Excel.', action: 'ESI Contribution Excel', btnText: 'Generate ESI (.xlsx)' },
    { title: 'PT Challan Summary', badge: 'State-wise', color: 'warning', desc: 'Aggregates Professional Tax deductions across all applicable state slabs based on employee work locations.', action: 'PT State-wise Challans', btnText: 'Generate PT Summary (.pdf)' },
    { title: 'TDS Form 24Q', badge: 'Quarterly', color: 'info', desc: 'Generates consolidated Annexure-II salary and tax declaration data for quarterly income tax filings.', action: 'TDS Q1 Return Dataset', btnText: 'Generate Form 24Q (.csv)' },
    { title: 'GSTR-1 Summary', badge: 'Monthly', color: 'neutral', desc: 'Extracts outward supplies and agency service invoice summaries for GST filing (B2B transactions).', action: 'GSTR-1 Export', btnText: 'Export GSTR-1 (.csv)' },
    { title: 'Client Audit Pack', badge: 'Consolidated', color: 'neutral', desc: 'Generates a complete compliance zip file per client including PF/ESI challan copies and registers.', action: 'Consolidated Client Audit Pack', btnText: 'Generate Audit Pack (.zip)' }
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
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Statutory Compliance Center" />
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Statutory Compliance Center</h2>
          <p className="text-gray-500 text-sm">PF, ESI, PT, LWF, TDS Returns & Challans</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={Download} onClick={() => showToast('Downloading all pending reports (ZIP format)...')}>Download Pending</Button>
          <Button variant="primary" icon={RefreshCw} onClick={() => showToast('Refreshing compliance status...')}>Sync Status</Button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 border-l-4 border-l-green-600 p-4 rounded-md mb-6 flex items-start gap-3">
        <CheckCircle2 className="text-green-700 w-6 h-6 mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-bold text-green-800 mb-1">Draft Returns Auto-Populated</div>
          <div className="text-xs text-green-700">Draft PF ECR, ESI File, and PT data auto-populated from <strong>Payroll Run #PR-0626 (Approved)</strong>. Review pending reports below before final filing.</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-8">
        <div className="flex-1 min-w-[300px] bg-gradient-to-br from-blue-900 to-slate-800 text-white p-6 rounded-md shadow flex items-center gap-6">
          <div className="w-20 h-20 rounded-full border-4 border-green-500 flex items-center justify-center text-2xl font-bold">
            {stats?.completed_filings}/{stats?.total_filings}
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1">Overall Compliance</h3>
            <p className="text-sm opacity-90 m-0">Excellent standing. {stats?.completed_filings} of {stats?.total_filings} required filings completed.</p>
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

      <h3 className="text-lg font-bold text-blue-900 mb-4">Upcoming Due Dates</h3>
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

      <h3 className="text-lg font-bold text-blue-900 mb-4">Generate Reports & Returns</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {reportsData.map((report, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-md p-5 flex flex-col hover:shadow-md hover:border-amber-500 transition-all duration-200">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-blue-900 text-base m-0">{report.title}</h4>
              <Badge variant={report.color}>{report.badge}</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-5 flex-1">{report.desc}</p>
            <div className="mt-auto">
              <Button variant="navy" className="w-full justify-center" disabled>
                {report.btnText} (Coming Soon)
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-blue-900 m-0 mb-4">Client-wise Compliance Register</h3>
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 border border-gray-200 rounded-md mb-6">
          <div className="flex-1 min-w-[150px]">
            <Select 
              label="Client" 
              options={[{value:'all',label:'All Clients'},{value:'mahindra',label:'Mahindra & Mahindra'},{value:'tcs',label:'TCS Staffing'},{value:'reliance',label:'Reliance Retail'}]} 
              noMargin
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select 
              label="Statute" 
              options={[{value:'all',label:'All Statutes'},{value:'pf',label:'PF'},{value:'esi',label:'ESI'},{value:'pt',label:'PT'},{value:'tds',label:'TDS'}]} 
              noMargin
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Input label="Due Date Range" type="month" value="2026-06" onChange={()=>{}} noMargin />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Select 
              label="Status" 
              options={[{value:'all',label:'All Statuses'},{value:'compliant',label:'Compliant'},{value:'pending',label:'Pending'},{value:'overdue',label:'Overdue'}]} 
              noMargin
            />
          </div>
          <div className="flex-none mt-6">
            <Button variant="secondary">Filter</Button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-md overflow-hidden">
          <DataTable columns={tableColumns} data={clients} keyField="id" />
        </div>
        
        <div className="mt-6 border-t border-gray-200 pt-4">
          <Pagination currentPage={1} totalPages={1} totalItems={17} itemsPerPage={3} onPageChange={()=>{}} />
        </div>
      </Card>
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
