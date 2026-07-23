import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Modal from '@/Components/ui/Modal';
import { Plus, CreditCard, DollarSign, Calendar, History, PauseCircle, PlayCircle, XCircle } from 'lucide-react';

export default function LoansAndAdvancesTab({ employee, loans = [] }) {
  const { errors } = usePage().props;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLoanForHistory, setSelectedLoanForHistory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    loan_type: 'company_loan',
    principal_amount: '',
    monthly_emi: '',
    start_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const empId = employee?.data?.id || employee?.id;

  const activeLoans = loans.filter(l => l.status === 'active');
  const totalPrincipal = loans.reduce((sum, l) => sum + (parseFloat(l.principal_amount) || 0), 0);
  const totalRepaid = loans.reduce((sum, l) => sum + (parseFloat(l.total_repaid) || 0), 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + (parseFloat(l.remaining_balance) || 0), 0);
  const monthlyEmiTotal = activeLoans.reduce((sum, l) => sum + (parseFloat(l.monthly_emi) || 0), 0);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'principal_amount' && (!prev.monthly_emi || parseFloat(prev.monthly_emi) > parseFloat(value))) {
        updated.monthly_emi = value;
      }
      return updated;
    });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    router.post(route('employees.loans.store', empId), formData, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        setSubmitting(false);
        setFormData({
          loan_type: 'company_loan',
          principal_amount: '',
          monthly_emi: '',
          start_date: new Date().toISOString().split('T')[0],
          reason: '',
        });
      },
      onError: () => setSubmitting(false),
    });
  };

  const handleStatusChange = (loanId, newStatus) => {
    if (confirm(`Are you sure you want to change loan status to ${newStatus}?`)) {
      router.patch(route('employees.loans.update-status', loanId), { status: newStatus });
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'salary_advance':
        return <span className="badge badge-info">Salary Advance</span>;
      case 'external_garnishment':
        return <span className="badge badge-warning">Garnishment</span>;
      default:
        return <span className="badge badge-primary">Company Loan</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active Deduction</span>;
      case 'paused':
        return <span className="badge badge-warning">Paused</span>;
      case 'cancelled':
        return <span className="badge badge-danger">Cancelled</span>;
      case 'completed':
        return <span className="badge badge-neutral">Completed</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 m-0">Loans & Advances Dashboard</h3>
          <p className="text-xs text-gray-500 mt-1 mb-0">
            Track agency-issued advances, company loans, monthly EMI deductions, and repayment history.
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Issue Loan / Advance
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md" className="border-l-4 border-l-blue-600">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active Loans</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{activeLoans.length}</div>
          <div className="text-xs text-blue-600 font-semibold mt-1">
            ₹{monthlyEmiTotal.toLocaleString('en-IN')}/mo recovery
          </div>
        </Card>

        <Card padding="md" className="border-l-4 border-l-slate-600">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Principal Issued</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">₹{totalPrincipal.toLocaleString('en-IN')}</div>
          <div className="text-xs text-gray-400 mt-1">Across all records</div>
        </Card>

        <Card padding="md" className="border-l-4 border-l-emerald-600">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Repaid</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">₹{totalRepaid.toLocaleString('en-IN')}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Recovered via payroll</div>
        </Card>

        <Card padding="md" className="border-l-4 border-l-amber-500">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Outstanding Balance</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</div>
          <div className="text-xs text-amber-700 font-medium mt-1">Pending recovery</div>
        </Card>
      </div>

      {/* Loans & Advances Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h4 className="text-sm font-bold text-gray-800 m-0">Loans & Advances Register</h4>
          <span className="text-xs text-gray-500">{loans.length} Record(s)</span>
        </div>

        {loans.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CreditCard className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600">No active or past loans found for this employee.</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              Click <strong>Issue Loan / Advance</strong> to create a new salary advance or multi-month company loan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4 font-bold">Loan No.</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold">Principal</th>
                  <th className="py-3 px-4 font-bold">Monthly EMI</th>
                  <th className="py-3 px-4 font-bold">Total Repaid</th>
                  <th className="py-3 px-4 font-bold">Remaining Balance</th>
                  <th className="py-3 px-4 font-bold">Start Date</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {loan.loan_number}
                      {loan.reason && (
                        <div className="text-[10px] font-normal text-gray-400 truncate max-w-[150px]" title={loan.reason}>
                          {loan.reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getTypeBadge(loan.loan_type)}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">₹{parseFloat(loan.principal_amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-bold text-blue-900">₹{parseFloat(loan.monthly_emi).toLocaleString('en-IN')} / mo</td>
                    <td className="py-3 px-4 font-medium text-emerald-600">₹{parseFloat(loan.total_repaid).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-bold text-amber-600">₹{parseFloat(loan.remaining_balance).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-gray-600">{loan.start_date}</td>
                    <td className="py-3 px-4">{getStatusBadge(loan.status)}</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        className="btn btn-secondary btn-xs text-[11px] py-1 px-2"
                        title="View Repayment History"
                        onClick={() => setSelectedLoanForHistory(loan)}
                      >
                        <History className="w-3 h-3 inline mr-1" /> History
                      </button>

                      {loan.status === 'active' && (
                        <button
                          className="btn btn-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                          title="Pause EMI Deductions"
                          onClick={() => handleStatusChange(loan.id, 'paused')}
                        >
                          <PauseCircle className="w-3 h-3" />
                        </button>
                      )}

                      {loan.status === 'paused' && (
                        <button
                          className="btn btn-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                          title="Resume EMI Deductions"
                          onClick={() => handleStatusChange(loan.id, 'active')}
                        >
                          <PlayCircle className="w-3 h-3" />
                        </button>
                      )}

                      {['active', 'paused'].includes(loan.status) && (
                        <button
                          className="btn btn-xs bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                          title="Cancel Loan"
                          onClick={() => handleStatusChange(loan.id, 'cancelled')}
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Issue Loan / Salary Advance */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Issue Loan / Salary Advance"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Loan Category *</label>
            <select
              name="loan_type"
              value={formData.loan_type}
              onChange={handleFormChange}
              className="form-control text-xs w-full"
              required
            >
              <option value="company_loan">Company Loan (Multi-month EMI schedule)</option>
              <option value="salary_advance">Salary Advance (Short-term advance)</option>
              <option value="external_garnishment">External Garnishment Order</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Principal Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                name="principal_amount"
                value={formData.principal_amount}
                onChange={handleFormChange}
                placeholder="e.g. 30000"
                className="form-control text-xs w-full"
                required
              />
              {errors.principal_amount && <span className="text-red-500 text-[10px]">{errors.principal_amount}</span>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Monthly EMI (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                name="monthly_emi"
                value={formData.monthly_emi}
                onChange={handleFormChange}
                placeholder="e.g. 5000"
                className="form-control text-xs w-full"
                required
              />
              {errors.monthly_emi && <span className="text-red-500 text-[10px]">{errors.monthly_emi}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Deduction Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleFormChange}
                className="form-control text-xs w-full"
                required
              />
            </div>
            <div className="flex items-center text-[11px] text-gray-500 italic pt-4">
              ℹ Deduction will automatically apply to draft payroll runs starting from this date.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Purpose / Reason (Optional)</label>
            <textarea
              name="reason"
              rows={2}
              value={formData.reason}
              onChange={handleFormChange}
              placeholder="e.g. Emergency medical expense advance approved by HR"
              className="form-control text-xs w-full"
            />
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded text-[11px] text-amber-800">
            <strong>⚠ Statutory 50% Cap Protection Notice:</strong> If total deductions (Statutory + TDS + EMI) exceed 50% of the employee's gross monthly salary during payroll processing, the EMI will be capped automatically, and any excess will be deferred to subsequent months.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Authorize & Issue Loan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Loan Repayment History */}
      {selectedLoanForHistory && (
        <Modal
          isOpen={!!selectedLoanForHistory}
          onClose={() => setSelectedLoanForHistory(null)}
          title={`Repayment Audit Trail: ${selectedLoanForHistory.loan_number}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded text-xs border border-gray-200">
              <div>
                <span className="text-gray-500 block">Principal:</span>
                <strong className="text-gray-900">₹{parseFloat(selectedLoanForHistory.principal_amount).toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Total Repaid:</span>
                <strong className="text-emerald-700">₹{parseFloat(selectedLoanForHistory.total_repaid).toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Remaining Balance:</span>
                <strong className="text-amber-700">₹{parseFloat(selectedLoanForHistory.remaining_balance).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <h5 className="text-xs font-bold text-gray-800 m-0">Monthly Payroll Repayment Logs</h5>

            {(!selectedLoanForHistory.repayments || selectedLoanForHistory.repayments.length === 0) ? (
              <p className="text-xs text-gray-500 italic py-4 text-center">
                No repayments recorded yet. Repayments are logged automatically when monthly payroll runs are locked.
              </p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 uppercase tracking-wider">
                    <th className="py-2 px-3">Payroll Month</th>
                    <th className="py-2 px-3">Deducted Amount</th>
                    <th className="py-2 px-3">Deferred Amount</th>
                    <th className="py-2 px-3">Date Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedLoanForHistory.repayments.map((rep) => (
                    <tr key={rep.id}>
                      <td className="py-2 px-3 font-semibold text-gray-800">{rep.payroll_month}</td>
                      <td className="py-2 px-3 font-bold text-emerald-700">₹{parseFloat(rep.amount_deducted).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-amber-600">
                        {parseFloat(rep.amount_deferred) > 0 ? `₹${parseFloat(rep.amount_deferred).toLocaleString('en-IN')} (50% Cap)` : '₹0.00'}
                      </td>
                      <td className="py-2 px-3 text-gray-500">{new Date(rep.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedLoanForHistory(null)}>
                Close History
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
