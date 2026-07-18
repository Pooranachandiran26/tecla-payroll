import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Select from '../../Components/ui/Select';
import Input from '../../Components/ui/Input';
import Modal from '../../Components/ui/Modal';

import RoleGuard from '../../Components/RoleGuard.jsx';
const CLIENT_BRANCHES = {
  mahindra: [
    { code: 'CHE-01', name: 'Chennai Office', gstin: '33AABCT1332L1ZQ', pocName: 'Vikas Mehta', pocEmail: 'vikas.m@mahindra.com', address: '123 Tech Park, OMR, Chennai, Tamil Nadu 600096' },
    { code: 'MUM-01', name: 'Mumbai HQ', gstin: '27AABCT1332L1ZA', pocName: 'Priya Nair', pocEmail: 'priya.n@mahindra.com', address: 'Mahindra Towers, Worli, Mumbai, Maharashtra 400018' }
  ],
  tcs: [
    { code: 'BAN-01', name: 'Bangalore Tech Park', gstin: '29AABCT5566K1ZB', pocName: 'Rohan Shetty', pocEmail: 'rohan.s@tcs.com', address: 'Whitefield IT Park, Bangalore, Karnataka 560066' },
    { code: 'DEL-01', name: 'Delhi NCR Office', gstin: '07AABCT5566K1ZC', pocName: 'Anjali Kapoor', pocEmail: 'anjali.k@tcs.com', address: 'Cyber City, Gurugram, Delhi NCR 122002' }
  ],
  reliance: [
    { code: 'MUC-01', name: 'Mumbai Central', gstin: '27AABCR7788L1ZD', pocName: 'Suresh Bhat', pocEmail: 'suresh.b@reliance.com', address: 'Reliance Corporate Park, Navi Mumbai, Maharashtra 400701' }
  ],
  wipro: [
    { code: 'HYD-01', name: 'Hyderabad Campus', gstin: '36AABCW9900M1ZE', pocName: 'Kavitha Rao', pocEmail: 'kavitha.r@wipro.com', address: 'Gachibowli, Hyderabad, Telangana 500032' },
    { code: 'PUN-01', name: 'Pune Office', gstin: '27AABCW9900M1ZF', pocName: 'Amit Desai', pocEmail: 'amit.d@wipro.com', address: 'Hinjewadi Phase 1, Pune, Maharashtra 411057' }
  ]
};

const BRANCH_EMPLOYEES = {
  'CHE-01': [
    { empCode: 'TEC-088', name: 'Aarav Sharma', designation: 'Senior Dev', gross: 45000 },
    { empCode: 'TEC-092', name: 'Sanjay Kumar', designation: 'QA Engineer', gross: 35000 },
    { empCode: 'TEC-095', name: 'Meena Krishnan', designation: 'BA', gross: 40000 },
    { empCode: 'TEC-101', name: 'Ravi Sundar', designation: 'DevOps', gross: 50000 },
    { empCode: 'TEC-107', name: 'Priya Iyer', designation: 'PM', gross: 55000 }
  ],
  'MUM-01': [
    { empCode: 'TEC-121', name: 'Neha Patil', designation: 'UX Designer', gross: 55000 },
    { empCode: 'TEC-142', name: 'Karan Malhotra', designation: 'Product Manager', gross: 85000 }
  ]
};

const CLIENT_MARKUPS = {
  mahindra: 8.5,
  tcs: 10,
  reliance: 9,
  wipro: 8
};

const getAgencyGSTIN = (branchStateCode) => {
  const mapping = { '33': '33AABCM1234N1ZP', '27': '27AABCM1234N1ZQ', '29': '29AABCM1234N1ZR', '07': '07AABCM1234N1ZS', '36': '36AABCM1234N1ZT' };
  return mapping[branchStateCode] || '33AABCM1234N1ZP';
};

const getStateName = (stateCode) => {
  const mapping = { '33': 'Tamil Nadu', '27': 'Maharashtra', '29': 'Karnataka', '07': 'Delhi', '36': 'Telangana' };
  return mapping[stateCode] || 'Tamil Nadu';
};

export default function InvoiceGenerate() {
  const [client, setClient] = useState('');
  const [branch, setBranch] = useState('');
  const [period, setPeriod] = useState('June 2026');
  const [date, setDate] = useState('2026-06-25');
  const [showEmployees, setShowEmployees] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [success, setSuccess] = useState(null);

  const branches = client ? CLIENT_BRANCHES[client] : [];
  
  const clientNames = {
    mahindra: 'Mahindra Corp',
    tcs: 'Tata Consultancy Services',
    reliance: 'Reliance Digital',
    wipro: 'Wipro Ltd'
  };

  let previewContent = null;
  let totals = null;
  
  if (branch && branch !== 'ALL') {
    const selectedBranch = branches.find(b => b.code === branch);
    const employees = BRANCH_EMPLOYEES[branch] || [];
    const markupPct = CLIENT_MARKUPS[client] || 8.5;
    const branchStateCode = selectedBranch.gstin.substring(0, 2);
    const agencyGSTIN = getAgencyGSTIN(branchStateCode);
    const isIntraState = branchStateCode === '33';
    const gstType = isIntraState ? 'CGST + SGST (Intra-state)' : 'IGST (Inter-state)';
    const placeOfSupply = getStateName(branchStateCode);
    
    let totalGross = 0;
    let totalMarkup = 0;
    employees.forEach(emp => {
      totalGross += emp.gross;
      totalMarkup += Math.round(emp.gross * (markupPct / 100));
    });
    
    // Mockup override for CHE-01
    if (branch === 'CHE-01') {
      totalGross = 3800000;
      totalMarkup = 323000;
    }
    const empCount = branch === 'CHE-01' ? 42 : employees.length;
    const gstTotal = Math.round(totalMarkup * 0.18);
    const grandTotal = totalGross + totalMarkup + gstTotal;
    
    totals = { branch: selectedBranch, empCount, grandTotal };

    previewContent = (
      <>
        <div className="flex justify-between mb-6">
          <div className="w-[48%] p-4 bg-[#F8FAFC] rounded-md border border-gray-200">
            <h4 className="m-0 mb-2 text-[#1F3864] text-[0.9rem] font-bold">Invoice From (Agency)</h4>
            <div className="text-[0.85rem] leading-relaxed">
              <strong>Tecla Media Pvt Ltd</strong><br />
              14, OMR IT Expressway, Taramani<br />
              Chennai, Tamil Nadu 600113<br />
              <strong>GSTIN:</strong> {agencyGSTIN}
            </div>
          </div>
          <div className="w-[48%] p-4 bg-[#F8FAFC] rounded-md border border-gray-200">
            <h4 className="m-0 mb-2 text-[#1F3864] text-[0.9rem] font-bold">Bill To (Client Branch)</h4>
            <div className="text-[0.85rem] leading-relaxed">
              <strong>{clientNames[client]}</strong><br />
              {selectedBranch.name}<br />
              {selectedBranch.address}<br />
              <strong>GSTIN:</strong> {selectedBranch.gstin}<br />
              <strong>POC:</strong> {selectedBranch.pocName} ({selectedBranch.pocEmail})
            </div>
          </div>
        </div>
        
        <div className="bg-[#E0F2FE] text-[#0284C7] p-3 rounded-md text-center mb-6 text-[0.9rem]">
          <strong>Place of Supply:</strong> {placeOfSupply} &nbsp;|&nbsp; <strong>GST Type:</strong> {gstType}
        </div>
        
        <div className="bg-[#F8FAFC] border border-gray-200 rounded-md p-4 mb-6">
          <h4 className="m-0 mb-2 text-[0.95rem] text-[#1F3864] font-bold">
            Employees Covered: {empCount} employees from {clientNames[client]} ({selectedBranch.name} — {selectedBranch.code})
          </h4>
          <div className="text-[0.85rem] mb-4">
            <strong>Total Gross:</strong> ₹{totalGross.toLocaleString('en-IN')} &nbsp;|&nbsp; 
            <strong>Agency Fee ({markupPct}%):</strong> ₹{totalMarkup.toLocaleString('en-IN')} &nbsp;|&nbsp; 
            <strong>Line Total:</strong> ₹{(totalGross + totalMarkup).toLocaleString('en-IN')}
          </div>
          <Button size="xs" variant="secondary" onClick={() => setShowEmployees(!showEmployees)}>
            {showEmployees ? 'Hide Employee Breakdown ▲' : 'View Employee Breakdown ▼'}
          </Button>
          
          {showEmployees && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-[0.8rem] text-gray-500 mb-4">
                For clients with large headcounts, use the summary view for invoice review and download the full employee list separately. The Grand Total below is always accurate regardless of how many rows are visible.
              </p>
              <div className="flex justify-between items-center mb-2">
                <Input placeholder="Search by Emp Code or Name..." className="w-[250px] text-sm py-1.5" />
                <Button size="xs" variant="secondary" onClick={() => alert('Downloading employee list as CSV...')}>Download Full List (.csv)</Button>
              </div>
              <table className="w-full border-collapse mb-2">
                <thead>
                  <tr className="bg-[#F1F5F9] text-left">
                    <th className="p-2 text-[0.8rem] border-b-2 border-gray-200 font-semibold">Emp Code</th>
                    <th className="p-2 text-[0.8rem] border-b-2 border-gray-200 font-semibold">Name</th>
                    <th className="p-2 text-[0.8rem] border-b-2 border-gray-200 font-semibold text-right">Gross Pay</th>
                    <th className="p-2 text-[0.8rem] border-b-2 border-gray-200 font-semibold text-right">Agency Fee ({markupPct}%)</th>
                    <th className="p-2 text-[0.8rem] border-b-2 border-gray-200 font-semibold text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const markup = Math.round(emp.gross * (markupPct / 100));
                    return (
                      <tr key={emp.empCode}>
                        <td className="p-2 border-b border-gray-100 text-[0.85rem]">{emp.empCode}</td>
                        <td className="p-2 border-b border-gray-100 text-[0.85rem]">{emp.name}<br/><span className="text-gray-500 text-[0.75rem]">{emp.designation}</span></td>
                        <td className="p-2 border-b border-gray-100 text-[0.85rem] text-right">₹{emp.gross.toLocaleString('en-IN')}</td>
                        <td className="p-2 border-b border-gray-100 text-[0.85rem] text-right">₹{markup.toLocaleString('en-IN')}</td>
                        <td className="p-2 border-b border-gray-100 text-[0.85rem] text-right">₹{(emp.gross + markup).toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex justify-between items-center text-[0.75rem] text-gray-500 mt-2">
                <span>Showing 1-{employees.length} of {empCount} employees</span>
                <div className="flex gap-1">
                  <span className="px-2 py-0.5 border border-gray-200 rounded text-gray-400">Prev</span>
                  <span className="px-2 py-0.5 border border-[#1F3864] bg-[#1F3864] text-white rounded">1</span>
                  {empCount > employees.length && (
                    <>
                      <span className="px-2 py-0.5 border border-gray-200 rounded">2</span>
                      <span className="px-2 py-0.5 border border-gray-200 rounded">3</span>
                    </>
                  )}
                  <span className="px-2 py-0.5 border border-gray-200 rounded">Next</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="w-1/2 ml-auto p-4 bg-[#F8FAFC] border border-gray-200 rounded-md">
          <h4 className="m-0 mb-2 border-b border-gray-200 pb-2 text-[0.95rem] font-bold">Invoice Summary</h4>
          <div className="flex justify-between text-[0.85rem] mb-1">
            <span>Total Employees:</span>
            <strong>{empCount}</strong>
          </div>
          <div className="flex justify-between text-[0.85rem] mb-1">
            <span>Gross Salary Pass-through:</span>
            <strong>₹{totalGross.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between text-[0.85rem] mb-1">
            <span>Agency Service Fee:</span>
            <strong>₹{totalMarkup.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between text-[0.85rem] mb-3">
            <span>GST (18% {isIntraState ? 'CGST+SGST' : 'IGST'}):</span>
            <strong>₹{gstTotal.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between text-[1.1rem] text-[#B8860B] border-t border-gray-200 pt-2">
            <strong>Grand Total:</strong>
            <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
          </div>
          <div className="text-right text-[0.75rem] text-gray-500 mt-2">
            Payment Due: Net 15 Days
          </div>
        </div>
      </>
    );
  } else if (branch === 'ALL') {
    previewContent = (
      <>
        <div className="bg-gray-100 text-gray-600 p-4 rounded-md border-l-4 border-gray-400 mb-6 text-[0.9rem]">
          <strong>Internal View Only:</strong> This is a consolidated view across all branches. This format should NOT be sent to clients as an invoice — generate individual branch invoices for GST compliance.
        </div>
        <div className="p-4 bg-[#F8FAFC] border border-gray-200 rounded-md mb-6">
          <h4 className="m-0 mb-2 text-[#1F3864] text-[0.9rem] font-bold">Consolidated Summary For: {clientNames[client]}</h4>
          <div className="text-[0.85rem] leading-relaxed">
            Total Active Branches: {branches.length}<br />
            (Detailed breakdown simulated)
          </div>
        </div>
      </>
    );
  }

  const handleGenerateClick = () => {
    if (branch === 'ALL') {
      alert("Consolidated summary generated successfully for internal records.");
    } else {
      setConfirmModal(true);
    }
  };

  const confirmGeneration = () => {
    setConfirmModal(false);
    const invNumber = 'INV-' + Math.floor(1000 + Math.random() * 9000);
    setSuccess(`Invoice #${invNumber} generated for ${totals.branch.name} — ${period}. Sent to ${totals.branch.pocEmail}.`);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Generate Invoice" />

      <div className="mb-6">
        <Link href={route('invoices.index')} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">← Back to Invoices</Link>
        <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Client Invoice Generation</h2>
        <p className="text-gray-500 text-[0.9rem]">Compile monthly employee expenditures, agency commissions, and service tax liabilities into invoice records.</p>
      </div>

      {!success && (
        <>
          <div className="bg-[#FFFBEB] border-l-4 border-[#F59E0B] p-4 mb-6 rounded-md flex justify-between items-start">
            <div className="text-[0.9rem] leading-relaxed">
              <strong className="text-[#D97706]">⚠ GST Compliance:</strong> Invoices must be raised separately per branch since each branch has its own GSTIN. Select a specific branch below to generate a compliant branch invoice. The 'All Branches' option is for internal reference only and should not be sent to clients.
            </div>
          </div>

          <div className="grid grid-cols-[1fr_300px] gap-6">
            <div className="card p-6">
              <h3 className="border-b border-gray-200 pb-2 mb-5 text-[1.05rem] font-bold">Invoice Configuration</h3>
              
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Client</label>
                  <Select value={client} onChange={(e) => { setClient(e.target.value); setBranch(''); setShowEmployees(false); }}>
                    <option value="" disabled>— Select a Client —</option>
                    <option value="mahindra">Mahindra Corp</option>
                    <option value="tcs">Tata Consultancy Services</option>
                    <option value="reliance">Reliance Digital</option>
                    <option value="wipro">Wipro Ltd</option>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
                  <Select value={branch} onChange={(e) => { setBranch(e.target.value); setShowEmployees(false); }} disabled={!client}>
                    <option value="">— Select a Client First —</option>
                    {client && (
                      <>
                        <option value="ALL">All Branches (Consolidated — Internal Only)</option>
                        {branches.map(b => (
                          <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                        ))}
                      </>
                    )}
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period</label>
                  <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="June 2026">June 2026</option>
                    <option value="May 2026">May 2026</option>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Creation Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              {previewContent && (
                <div className="mt-8">
                  <h3 className="text-[1.1rem] text-[#1F3864] mb-4 border-b border-gray-200 pb-2 font-bold">Invoice Preview</h3>
                  <div className="border border-gray-200 rounded-md bg-white p-6">
                    {previewContent}
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-end mt-8">
                <Link href={route('invoices.index')}>
                  <Button variant="secondary">Cancel</Button>
                </Link>
                <Button 
                  variant={branch === 'ALL' ? 'secondary' : 'primary'} 
                  disabled={!branch}
                  onClick={handleGenerateClick}
                >
                  {branch === 'ALL' ? 'Generate Consolidated Summary' : 'Generate Invoice PDF'}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="card bg-[#1F3864] text-white border-0">
                <h4 className="text-white mb-2 font-bold">Invoicing Instructions</h4>
                <p className="text-[0.8rem] opacity-90 leading-relaxed">
                  For <strong>Pass-through model</strong> contracts, GST is calculated solely on the markup commission fee instead of the base employee CTC. Ensure regulatory tax compliance forms are verified prior to sending.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {success && (
        <div className="bg-[#ECFDF5] border-l-4 border-green-500 p-4 rounded-md mb-6">
          <strong className="text-green-600">✓ Success:</strong> <span dangerouslySetInnerHTML={{ __html: success }} />
          <div className="mt-4">
            <Link href={route('invoices.index')}>
              <Button size="xs" variant="secondary">Back to Invoices</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Invoice Generation">
        {totals && (
          <div className="p-4">
            <div className="text-[0.9rem] leading-relaxed text-gray-800">
              Generate invoice for <strong>{clientNames[client]} — {totals.branch.name}</strong><br />
              <span className="text-gray-500 text-[0.8rem]">(GSTIN: {totals.branch.gstin})</span><br /><br />
              <strong>Period:</strong> {period}<br />
              <strong>Employees:</strong> {totals.empCount}<br />
              <strong>Grand Total:</strong> ₹{totals.grandTotal.toLocaleString('en-IN')}<br /><br />
              This invoice will be emailed to <strong>{totals.branch.pocName}</strong> at <strong>{totals.branch.pocEmail}</strong>. Confirm?
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="secondary" onClick={() => setConfirmModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={confirmGeneration}>Confirm & Generate</Button>
        </div>
      </Modal>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
