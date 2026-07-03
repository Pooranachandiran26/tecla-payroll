import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import Button from '../../Components/ui/Button';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function Payslip() {
  const [selectedEmp, setSelectedEmp] = useState({ code: 'TEC-088', name: 'Aarav Sharma', net: 37660 });

  const loadPayslip = (code, name, net) => {
    setSelectedEmp({ code, name, net });
  };

  const getWords = (net) => {
    if (net === 37660) return "Rupees Thirty-Seven Thousand Six Hundred Sixty Only";
    if (net === 29400) return "Rupees Twenty-Nine Thousand Four Hundred Only";
    if (net === 16411) return "Rupees Sixteen Thousand Four Hundred Eleven Only";
    return `Rupees ${net} Only`;
  };

  const payslipsList = [
    { code: 'TEC-088', name: 'Aarav Sharma', net: 37660 },
    { code: 'TEC-121', name: 'Neha Patil', net: 29400 },
    { code: 'TEC-168', name: 'Vikram Rao', net: 16411 }
  ];

  return (
    <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
      <Head title="Payslips" />
      
      <style>{`
        .payslip-container {
          background-color: white;
          border: 1px solid #CBD5E1;
          padding: 2.5rem;
          border-radius: var(--radius-sm);
          margin-bottom: 2rem;
        }
        .payslip-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid var(--primary-navy);
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .payslip-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-navy);
          text-transform: uppercase;
        }
        .payslip-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          font-size: 0.8rem;
          background-color: #F8FAFC;
          padding: 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
        }
        .payslip-meta-label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .payslip-meta-val {
          font-weight: 600;
          color: var(--text-main);
        }
      `}</style>

      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1F3864] mb-1">Employee Payslips Center</h2>
          <p className="text-gray-500 text-sm">Review, download, or dispatch finalized payslips for June 2026.</p>
        </div>
        <div>
          <Button variant="navy" onClick={() => alert('Batch payslips dispatched via email to all 42 employees.')}>
            📧 Dispatch All via Email
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6 items-start">
        {/* Payslip Print Preview */}
        <div>
          <div className="payslip-container">
            <div className="payslip-header">
              <div>
                <div className="font-bold text-[1.2rem] text-[#1F3864]">TECLA AGENCY PRIVATE LIMITED</div>
                <div className="text-[0.75rem] text-gray-500">BKC, Mumbai, Maharashtra | GST: 27AAAA0000A1Z1</div>
              </div>
              <div className="text-right">
                <div className="payslip-title">Salary Payslip</div>
                <div className="text-[0.85rem] font-semibold">Month: June 2026</div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="flex gap-8 bg-[#F8FAFC] p-6 rounded-md mb-6 border border-gray-200">
              <div className="flex-1 flex flex-col gap-3 text-[0.85rem]">
                <div className="flex justify-between"><span className="payslip-meta-label">Employee Code</span><span className="payslip-meta-val">{selectedEmp.code}</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">Department</span><span className="payslip-meta-val">Engineering</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">Date of Joining</span><span className="payslip-meta-val">15-Jan-2025</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">Actual Working Days</span><span className="payslip-meta-val">26</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">PAN</span><span className="payslip-meta-val">ABCDE1234F</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">Bank Name</span><span className="payslip-meta-val">HDFC Bank</span></div>
              </div>
              <div className="flex-1 flex flex-col gap-3 text-[0.85rem]">
                <div className="flex justify-between"><span className="payslip-meta-label">Employee Name</span><span className="payslip-meta-val">{selectedEmp.name}</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">Designation</span><span className="payslip-meta-val">Senior Developer</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">LOP days</span><span className="payslip-meta-val">0</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">Total Working Days</span><span className="payslip-meta-val">26</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">Account No</span><span className="payslip-meta-val">••••••••398571</span></div>
                <div className="flex justify-between"><span className="payslip-meta-label">IFSC Code</span><span className="payslip-meta-val">HDFC0000001</span></div>
              </div>
            </div>

            {/* ESI & PF */}
            <div className="flex gap-8 mb-8">
              <div className="flex-1 bg-white border border-gray-200 rounded-md p-5 shadow-sm">
                <h4 className="text-[0.95rem] text-[#1F3864] mb-3 border-b border-gray-200 pb-2 font-bold">ESI Details</h4>
                <div className="flex flex-col gap-2 text-[0.85rem]">
                  <div className="flex justify-between"><span className="payslip-meta-label">Employee ESI No.</span><span className="payslip-meta-val">3114589723 (Ineligible)</span></div>
                  <div className="flex justify-between"><span className="payslip-meta-label">Employee Contribution</span><span className="payslip-meta-val">₹0</span></div>
                  <div className="flex justify-between"><span className="payslip-meta-label">Employer Contribution</span><span className="payslip-meta-val">₹0</span></div>
                  <hr className="border-t border-gray-200 my-1" />
                  <div className="flex justify-between font-bold"><span className="text-[#1F3864]">Total ESI</span><span>₹0</span></div>
                </div>
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-md p-5 shadow-sm">
                <h4 className="text-[0.95rem] text-[#1F3864] mb-3 border-b border-gray-200 pb-2 font-bold">PF Details</h4>
                <div className="flex flex-col gap-2 text-[0.85rem]">
                  <div className="flex justify-between"><span className="payslip-meta-label">Employee PF No.</span><span className="payslip-meta-val">100523485790</span></div>
                  <div className="flex justify-between"><span className="payslip-meta-label">Employee Contribution</span><span className="payslip-meta-val">₹2,640</span></div>
                  <div className="flex justify-between"><span className="payslip-meta-label">Employer Contribution</span><span className="payslip-meta-val">₹2,640</span></div>
                  <hr className="border-t border-gray-200 my-1" />
                  <div className="flex justify-between font-bold"><span className="text-[#1F3864]">Total PF</span><span>₹5,280</span></div>
                </div>
              </div>
            </div>

            {/* Earnings vs Deductions */}
            <div className="flex gap-8 mb-8">
              <div className="flex-1">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="bg-[#1F3864] text-white p-2 border border-[#1F3864]">Components</th>
                      <th className="bg-[#1F3864] text-white p-2 text-right border border-[#1F3864]">Earned Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border border-gray-200">1. Basic Pay</td><td className="p-2 border border-gray-200 text-right font-semibold">₹22,000</td></tr>
                    <tr><td className="p-2 border border-gray-200">2. HRA (House Rent Allowance)</td><td className="p-2 border border-gray-200 text-right font-semibold">₹11,000</td></tr>
                    <tr><td className="p-2 border border-gray-200">3. Conveyance</td><td className="p-2 border border-gray-200 text-right font-semibold">₹1,600</td></tr>
                    <tr><td className="p-2 border border-gray-200">4. DA (Dearness Allowance)</td><td className="p-2 border border-gray-200 text-right font-semibold">₹0</td></tr>
                    <tr><td className="p-2 border border-gray-200">5. Medical Allowance</td><td className="p-2 border border-gray-200 text-right font-semibold">₹0</td></tr>
                    <tr><td className="p-2 border border-gray-200">6. Special Allowance</td><td className="p-2 border border-gray-200 text-right font-semibold">₹10,400</td></tr>
                    <tr><td className="p-2 border border-gray-200">7. Other Additions</td><td className="p-2 border border-gray-200 text-right font-semibold">₹0</td></tr>
                    <tr><td className="p-2 border border-gray-200">8. Arrears Amount</td><td className="p-2 border border-gray-200 text-right font-semibold">₹0</td></tr>
                    <tr className="bg-[#F1F5F9] font-bold border-t-2 border-t-[#1F3864]">
                      <td className="p-2 border border-gray-200">Gross Total</td>
                      <td className="p-2 border border-gray-200 text-right text-[#1F3864]">₹45,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex-1">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="bg-[#1F3864] text-white p-2 border border-[#1F3864]">Deductions</th>
                      <th className="bg-[#1F3864] text-white p-2 text-right border border-[#1F3864]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border border-gray-200">1. Employee PF</td><td className="p-2 border border-gray-200 text-right font-semibold">₹2,640</td></tr>
                    <tr><td className="p-2 border border-gray-200">2. Employee ESIC</td><td className="p-2 border border-gray-200 text-right font-semibold">₹0</td></tr>
                    <tr><td className="p-2 border border-gray-200">3. Professional Tax</td><td className="p-2 border border-gray-200 text-right font-semibold">₹200</td></tr>
                    <tr><td className="p-2 border border-gray-200">4. Welfare Fund</td><td className="p-2 border border-gray-200 text-right font-semibold">₹0</td></tr>
                    <tr><td className="p-2 border border-gray-200">5. LOP Deduction</td><td className="p-2 border border-gray-200 text-right font-semibold">₹0</td></tr>
                    <tr><td className="p-2 border border-gray-200">6. TDS</td><td className="p-2 border border-gray-200 text-right font-semibold">₹4,500</td></tr>
                    <tr><td className="p-2 border border-transparent h-[36px]" colSpan="2"></td></tr>
                    <tr><td className="p-2 border border-transparent h-[36px]" colSpan="2"></td></tr>
                    <tr className="bg-[#FFF5F5] font-bold border-t-2 border-t-red-600">
                      <td className="p-2 border border-gray-200">Total Deductions</td>
                      <td className="p-2 border border-gray-200 text-right text-red-600">₹7,340</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Statement */}
            <div className="bg-[#1F3864] text-white p-5 px-8 rounded-md flex justify-between items-center shadow-lg">
              <div className="text-[1.4rem] font-bold text-[#B8860B]">
                Net Pay Rs.{selectedEmp.net.toLocaleString('en-IN')}/-
              </div>
              <div className="text-[1.1rem] italic font-medium">
                ({getWords(selectedEmp.net)})
              </div>
            </div>

            <div className="text-center text-[0.85rem] font-medium text-gray-500 mt-10 border-t border-gray-200 pt-6">
              This is a computer generated Payslip. Hence, Signature is not required.
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="secondary" onClick={() => window.print()}>🖨 Print Payslip</Button>
            <Button variant="primary" onClick={() => alert('Downloading Payslip PDF file.')}>📥 Download PDF</Button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 className="text-lg font-bold text-[#1F3864] mb-4">June 2026 Batch</h3>
            
            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
              {payslipsList.map((emp) => {
                const isActive = selectedEmp.code === emp.code;
                return (
                  <div 
                    key={emp.code}
                    className={`p-2 rounded-md border cursor-pointer transition-colors ${isActive ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => loadPayslip(emp.code, emp.name, emp.net)}
                  >
                    <div className="text-[0.85rem] font-bold text-gray-900">{emp.name}</div>
                    <div className="text-[0.75rem] text-gray-500">Net: ₹{emp.net.toLocaleString('en-IN')} ({emp.code})</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
