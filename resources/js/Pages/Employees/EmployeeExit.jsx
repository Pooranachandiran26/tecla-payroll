import React, { useState, useEffect } from 'react';
import './EmployeeExit.css';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Button from '../../Components/ui/Button';
import Select from '../../Components/ui/Select';
import Input from '../../Components/ui/Input';
import Badge from '../../Components/ui/Badge';
import Modal from '../../Components/ui/Modal';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';
const STEPS = [
  { id: 1, label: 'Initiate' },
  { id: 2, label: 'Notice Period' },
  { id: 3, label: 'Clearance' },
  { id: 4, label: 'Exit Interview' },
  { id: 5, label: 'Settlement' },
  { id: 6, label: 'Confirm Exit' },
  { id: 7, label: 'Documents' },
];

export default function EmployeeExit() {
  const { showToast } = useToast();
  const [currentStage, setCurrentStage] = useState(1);
  const [highestStageReached, setHighestStageReached] = useState(1);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [confirmExitModalOpen, setConfirmExitModalOpen] = useState(false);

  // Initialize Dates
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSubmissionDate(today);
    const lwdDate = new Date();
    lwdDate.setDate(lwdDate.getDate() + 30);
    setLwd(lwdDate.toISOString().split('T')[0]);
  }, []);

  // Stage 1
  const [exitType, setExitType] = useState('Resignation');
  const [reasonCategory, setReasonCategory] = useState('Better Opportunity');
  const [submissionDate, setSubmissionDate] = useState('');
  const [discussed, setDiscussed] = useState('yes');
  const [discussionSummary, setDiscussionSummary] = useState('');

  // Stage 2
  const [lwd, setLwd] = useState('');
  
  // Stage 3
  const [clearances, setClearances] = useState({
    laptop: '', idcard: '', manager: '', itaccess: '', handover: '', client: ''
  });

  // Stage 4
  const [interviewReason, setInterviewReason] = useState('');
  const [recommend, setRecommend] = useState('yes');
  const [starRating, setStarRating] = useState(4);

  // Stage 5
  const [simYears, setSimYears] = useState('4.8');
  const [simLoan, setSimLoan] = useState('5000');
  const [showAdhoc, setShowAdhoc] = useState(false);
  const [adhocAmount, setAdhocAmount] = useState('');
  const [adhocReason, setAdhocReason] = useState('');
  const [adhocs, setAdhocs] = useState([]);
  const [settlementStatus, setSettlementStatus] = useState('draft'); // draft, pending, approved

  const goToStage = (stage) => {
    if (stage > highestStageReached && stage !== 7 && stage !== 6) {
      return; // Locked
    }
    if (stage === 6 && settlementStatus !== 'approved') {
      showToast({ message: 'Stage 6 is locked until Stage 5 Settlement is Approved.', type: 'error' });
      return;
    }
    setCurrentStage(stage);
  };

  const completeStage = (stageNum) => {
    const nextStage = stageNum + 1;
    if (nextStage > highestStageReached) {
      setHighestStageReached(nextStage);
    }
    goToStage(nextStage);
  };

  const allClearancesSelected = Object.values(clearances).every(val => val !== '');

  const applyAdhoc = () => {
    if (adhocAmount && adhocReason) {
      setAdhocs([...adhocs, { amount: parseFloat(adhocAmount), reason: adhocReason }]);
      setShowAdhoc(false);
      setAdhocAmount('');
      setAdhocReason('');
    } else {
      showToast({ message: 'Enter both amount and reason', type: 'error' });
    }
  };

  // ── DYNAMIC COMPUTATIONS ──
  const isEmployerInitiated = exitType === 'Termination' || exitType === 'Client-Initiated';

  let diffDays = 0;
  let shortfallDays = 0;
  if (submissionDate && lwd) {
    const diffTime = new Date(lwd) - new Date(submissionDate);
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0;
    shortfallDays = 30 - diffDays;
    if (shortfallDays < 0) shortfallDays = 0;
  }

  const basicMonthly = 22000;
  const ctcMonthly = 45000;
  const dailyBasic = Math.round(basicMonthly / 30);
  const dailyCtc = Math.round(ctcMonthly / 30);

  const settlement = React.useMemo(() => {
    const salaryAmount = ctcMonthly;
    const leaveAmount = 12 * dailyBasic;
    const bonusAmount = 12500;
    let gratuityAmount = 0;
    
    const yearsVal = parseFloat(simYears) || 0;
    if (yearsVal >= 5.0) {
      gratuityAmount = Math.round((basicMonthly / 26) * 15 * yearsVal);
    }
    
    let noticeAmount = 0;
    if (shortfallDays > 0) {
      if (isEmployerInitiated) {
        noticeAmount = shortfallDays * dailyCtc;
      } else {
        noticeAmount = shortfallDays * dailyBasic;
      }
    }

    const tdsAmount = 6200;
    const loanInputVal = parseFloat(simLoan) || 0;
    
    let adhocVal = 0;
    adhocs.forEach(a => adhocVal += a.amount);

    let subtotal = salaryAmount + leaveAmount + bonusAmount + gratuityAmount + adhocVal;
    if (isEmployerInitiated && shortfallDays > 0) {
      subtotal += noticeAmount;
    } else if (!isEmployerInitiated && shortfallDays > 0) {
      subtotal -= noticeAmount;
    }
    subtotal -= tdsAmount;

    let finalNet = subtotal - loanInputVal;
    const loanOverflow = finalNet < 0;
    const unrecoveredLoan = loanOverflow ? Math.abs(finalNet) : 0;
    if (finalNet < 0) finalNet = 0; // Floor at 0

    return {
      salaryAmount, leaveAmount, bonusAmount, gratuityAmount, 
      noticeAmount, tdsAmount, loanInputVal, adhocVal,
      subtotal, finalNet, loanOverflow, unrecoveredLoan
    };
  }, [simYears, simLoan, adhocs, shortfallDays, isEmployerInitiated]);

  const executeExit = () => {
    setConfirmExitModalOpen(false);
    showToast({ message: 'Employee Exit Confirmed', type: 'success' });
    completeStage(6);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
      <Head title="Employee Exit Wizard" />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/employees/88" className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
            ← Back to Aarav's Profile
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Employee Exit & Full & Final Workflow</h2>
          <p className="text-gray-500 text-sm">Guided multi-stage exit wizard for <strong>Aarav Sharma (TEC-088)</strong></p>
        </div>
        <div>
          <Button variant="outline" onClick={() => setCancelModalOpen(true)}>Cancel Exit Process</Button>
        </div>
      </div>

      {/* Step Tracker */}
      <div className="step-tracker-container">
        <div className="step-tracker">
          {STEPS.map((step, index) => {
            const isActive = currentStage === step.id;
            const isCompleted = step.id < currentStage;
            const isLocked = step.id > highestStageReached + 1;

            return (
              <React.Fragment key={step.id}>
                <div 
                  className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => goToStage(step.id)}
                >
                  <div className="step-circle">{step.id}</div>
                  <div className="step-label">{step.id}. {step.label}</div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`step-connector ${isCompleted ? 'completed' : ''}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Stage 1 */}
      {currentStage === 1 && (
        <div className="wizard-stage active animation-fadeIn">
          <div className="section-card">
            <div className="stage-header">
              <h3 className="stage-title">Stage 1: Initiate Exit Request</h3>
              <Badge type="neutral">Drafting</Badge>
            </div>
            
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Exit Type <span className="text-red-500">*</span></label>
                <Select value={exitType} onChange={e => {
                  setExitType(e.target.value);
                  setReasonCategory('');
                }}>
                  <option value="Resignation">Resignation (Employee-Initiated)</option>
                  <option value="Termination">Termination (Employer-Initiated)</option>
                  <option value="End of Contract">End of Contract</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Client-Initiated">Client-Initiated Roll-off</option>
                </Select>
              </div>
              <div className="form-group flex-1">
                <label>Reason Category <span className="text-red-500">*</span></label>
                <Select value={reasonCategory} onChange={e => setReasonCategory(e.target.value)}>
                  <option value="">Select Reason...</option>
                  {exitType === 'Resignation' && <>
                    <option value="Better Opportunity">Better Opportunity</option>
                    <option value="Personal Reasons">Personal Reasons</option>
                    <option value="Relocation">Relocation</option>
                    <option value="Other">Other</option>
                  </>}
                  {exitType === 'Termination' && <>
                    <option value="Performance">Performance</option>
                    <option value="Conduct / Policy Violation">Conduct / Policy Violation</option>
                    <option value="Redundancy">Redundancy / Position Elimination</option>
                  </>}
                  {exitType === 'End of Contract' && <>
                    <option value="Project Completed">Project Completed</option>
                    <option value="Fixed Term Expired">Fixed Term Expired</option>
                    <option value="Non-Renewal">Non-Renewal</option>
                  </>}
                  {exitType === 'Retirement' && <>
                    <option value="Superannuation">Superannuation</option>
                    <option value="Voluntary Retirement">Voluntary Retirement</option>
                    <option value="Health Reasons">Health Reasons</option>
                  </>}
                  {exitType === 'Client-Initiated' && <>
                    <option value="Project Roll-off">Project Roll-off</option>
                    <option value="Cost Reduction">Cost Reduction</option>
                    <option value="Replaced by Client">Replaced by Client</option>
                  </>}
                </Select>
              </div>
            </div>

            <div className="form-row mt-4">
              <div className="form-group flex-1">
                <label>Submission / Notice Date</label>
                <Input type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} />
              </div>
              <div className="form-group flex-1"></div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="font-semibold block mb-2 text-[#1F3864]">Was this exit discussed with the employee in advance?</label>
              <div className="flex gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input type="radio" name="discussed" value="yes" checked={discussed === 'yes'} onChange={() => setDiscussed('yes')} /> Yes, discussed
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input type="radio" name="discussed" value="no" checked={discussed === 'no'} onChange={() => setDiscussed('no')} /> No, not discussed
                </label>
              </div>
              {discussed === 'yes' && (
                <div>
                  <label>Discussion Summary & Key Takeaways</label>
                  <textarea 
                    className="form-control" rows="3" 
                    placeholder="Summarize the exit discussion..."
                    value={discussionSummary} onChange={e => setDiscussionSummary(e.target.value)}
                  ></textarea>
                </div>
              )}
            </div>

            <div className="wizard-footer">
              <Button variant="outline" onClick={() => setCancelModalOpen(true)}>Cancel Exit Process</Button>
              <button className="btn-gold" onClick={() => completeStage(1)}>Next: Notice Period →</button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 */}
      {currentStage === 2 && (
        <div className="wizard-stage active animation-fadeIn">
          <div className="section-card">
            <div className="stage-header">
              <h3 className="stage-title">Stage 2: Notice Period & LWD Determination</h3>
              <Badge type="info">Notice Tracking</Badge>
            </div>

            <div className="alert-banner info">
              ℹ️ <strong>Contractual Notice Required:</strong> <span className="font-bold ml-1">30 Days</span> (pulled from current active employment agreement).
            </div>

            <div className="form-row mt-6">
              <div className="form-group flex-1">
                <label>Last Working Day (LWD)</label>
                <Input type="date" value={lwd} onChange={e => setLwd(e.target.value)} />
              </div>
              <div className="form-group flex-1">
                <label>Calculated Notice Period Status</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[0.95rem] font-semibold">
                  {shortfallDays > 0 ? (
                    isEmployerInitiated 
                      ? `Notice Served: ${diffDays} days | Notice Pay in Lieu: ${shortfallDays} days`
                      : `Notice Served: ${diffDays} days | Shortfall: ${shortfallDays} days`
                  ) : (
                    `Notice Served: ${diffDays} days | Shortfall: 0 days`
                  )}
                </div>
              </div>
            </div>

            {shortfallDays > 0 && isEmployerInitiated && (
              <div className="alert-banner info mt-4">
                ℹ️ <strong>Notice Pay in Lieu:</strong> Since this is an employer/client-initiated exit ({exitType}) with a notice shortfall of {shortfallDays} days, the agency will provide Notice Pay in Lieu to the employee in the final settlement.
              </div>
            )}
            {shortfallDays > 0 && !isEmployerInitiated && (
              <div className="alert-banner amber mt-4">
                ⚠ <strong>Notice Shortfall Recovery:</strong> Employee is serving {diffDays} days against the required 30 days. A shortfall recovery for {shortfallDays} days will be deducted in the final settlement.
              </div>
            )}

            <div className="wizard-footer">
              <Button variant="outline" onClick={() => goToStage(1)}>← Back to Initiate</Button>
              <button className="btn-gold" onClick={() => completeStage(2)}>Next: Clearance →</button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3 */}
      {currentStage === 3 && (
        <div className="wizard-stage active animation-fadeIn">
          <div className="section-card">
            <div className="stage-header">
              <h3 className="stage-title">Stage 3: Departmental Clearance Checklist</h3>
              <Badge type="warning">Verification</Badge>
            </div>
            <p className="text-gray-500 text-sm mb-6">Verify that all enterprise items, client security tokens, and handovers are completed.</p>

            <table className="data-table checklist-table">
              <thead>
                <tr>
                  <th>Clearance Item</th>
                  <th>Department / Owner</th>
                  <th>Status Selector</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'laptop', name: 'Asset Return (Laptop & Accessories)', owner: 'IT Support' },
                  { id: 'idcard', name: 'Asset Return (ID Card / Access Card)', owner: 'Facility Security' },
                  { id: 'manager', name: 'Manager Sign-off & Handover Approval', owner: 'Reporting Manager' },
                  { id: 'itaccess', name: 'IT Access Revocation (Email, VPN, ERP)', owner: 'Cloud Infrastructure' },
                  { id: 'handover', name: 'Pending Task Handover & Documentation', owner: 'Project Lead' },
                  { id: 'client', name: 'Client Notification Sent (Roll-off Formalized)', owner: 'Account Partner' },
                ].map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.owner}</td>
                    <td>
                      <select 
                        className={`status-select ${clearances[item.id]}`}
                        value={clearances[item.id]}
                        onChange={(e) => setClearances({...clearances, [item.id]: e.target.value})}
                      >
                        <option value="">-- Select Status --</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                        <option value="na">N/A</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!allClearancesSelected ? (
              <div className="alert-banner amber mt-6">
                ⚠ <strong>Action Required:</strong> Please mark all 6 clearance items above to unlock the next stage.
              </div>
            ) : (
              <div className="alert-banner green mt-6">
                ✓ <strong>Clearance Complete:</strong> All departmental items have been verified. You may proceed to the Exit Interview.
              </div>
            )}

            <div className="wizard-footer">
              <Button variant="outline" onClick={() => goToStage(2)}>← Back to Notice Period</Button>
              <button 
                className="btn-gold" 
                onClick={() => completeStage(3)}
                disabled={!allClearancesSelected}
              >
                Next: Exit Interview →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 4 */}
      {currentStage === 4 && (
        <div className="wizard-stage active animation-fadeIn">
          <div className="section-card">
            <div className="stage-header">
              <h3 className="stage-title">Stage 4: Exit Interview & Qualitative Feedback</h3>
              <Badge type="neutral">Optional</Badge>
            </div>
            
            <div className="form-group mb-6">
              <label>Detailed Reason for Leaving & Constructive Feedback</label>
              <textarea 
                className="form-control" rows="4" 
                value={interviewReason} onChange={e => setInterviewReason(e.target.value)}
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="font-semibold block mb-2">Would the employee recommend Tecla Agency to peers?</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 font-medium cursor-pointer">
                    <input type="radio" checked={recommend === 'yes'} onChange={() => setRecommend('yes')} /> Yes
                  </label>
                  <label className="flex items-center gap-2 font-medium cursor-pointer">
                    <input type="radio" checked={recommend === 'no'} onChange={() => setRecommend('no')} /> No
                  </label>
                </div>
              </div>
              <div className="form-group flex-1">
                <label className="font-semibold block mb-2">Overall Experience Rating (1-5 Stars)</label>
                <div className="star-rating">
                  {[1,2,3,4,5].map(star => (
                    <span 
                      key={star} 
                      className={`star ${star <= starRating ? 'active' : ''}`}
                      onClick={() => setStarRating(star)}
                    >★</span>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">{starRating} / 5 Stars</div>
              </div>
            </div>

            <div className="wizard-footer">
              <Button variant="outline" onClick={() => goToStage(3)}>← Back to Clearance</Button>
              <div className="flex gap-4 items-center">
                <button className="text-[#1F3864] underline text-sm font-semibold" onClick={() => completeStage(4)}>Skip this step</button>
                <button className="btn-gold" onClick={() => completeStage(4)}>Next: Settlement →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage 5 */}
      {currentStage === 5 && (
        <div className="wizard-stage active animation-fadeIn">
          <div className="section-card">
            <div className="stage-header">
              <h3 className="stage-title">Stage 5: Full & Final Settlement Computation</h3>
              <Badge type="gold">
                {settlementStatus === 'draft' ? 'Draft Computation' : settlementStatus === 'pending' ? 'Pending Approval' : 'Approved'}
              </Badge>
            </div>

            <div className="bg-slate-50 border border-slate-300 p-4 rounded-md mb-6 flex gap-6 items-center flex-wrap">
              <div className="text-[0.85rem] font-bold text-[#1F3864]">⚙️ Mockup Simulation Controls:</div>
              <div className="flex items-center gap-2">
                <label className="text-[0.8rem] font-semibold">Years of Service:</label>
                <Select value={simYears} onChange={e => setSimYears(e.target.value)} className="w-48 py-1">
                  <option value="1.5">1.5 Years (No Gratuity)</option>
                  <option value="4.8">4.8 Years (Borderline Flag)</option>
                  <option value="5.4">5.4 Years (Gratuity Eligible)</option>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[0.8rem] font-semibold">Loan Recovery (₹):</label>
                <Input type="number" value={simLoan} onChange={e => setSimLoan(e.target.value)} className="w-32 py-1" />
              </div>
            </div>

            {parseFloat(simYears) >= 4.5 && parseFloat(simYears) < 5.0 && (
              <div className="alert-banner amber mb-4">
                ⚠ <strong>Gratuity Review Required:</strong> Service duration is borderline for gratuity eligibility ({simYears} Years) — confirm before finalizing.
              </div>
            )}
            
            {settlement.loanOverflow && (
              <div className="alert-banner amber mb-4" style={{ backgroundColor: '#FFF5F5', borderColor: '#FEB2B2', color: '#C53030', borderLeftColor: '#E53E3E' }}>
                ⛔ <strong>Loan Recovery Deficit Flag:</strong> Outstanding balance of ₹{settlement.unrecoveredLoan.toLocaleString('en-IN')} could not be fully recovered from settlement — flagged for separate finance follow-up.
              </div>
            )}

            <table className="data-table settlement-table w-full mb-6">
              <thead>
                <tr>
                  <th>Component Line Item</th>
                  <th>Calculation Basis / Notes</th>
                  <th className="text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Pending Salary (Pro-rated)</strong></td>
                  <td>June Earned Salary (pro-rated based on LWD)</td>
                  <td className="text-right amount-pos">+₹{settlement.salaryAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td><strong>Leave Encashment</strong></td>
                  <td>12 Accrued Unused Earned Leaves</td>
                  <td className="text-right amount-pos">+₹{settlement.leaveAmount.toLocaleString('en-IN')}</td>
                </tr>
                {shortfallDays > 0 && (
                  <tr>
                    <td><strong>{isEmployerInitiated ? 'Notice Pay in Lieu (Addition)' : 'Notice Period Shortfall Recovery'}</strong></td>
                    <td>{isEmployerInitiated ? `Agency providing pay in lieu for ${shortfallDays} days notice shortfall` : `Shortfall deduction for ${shortfallDays} days unserved notice`}</td>
                    <td className={`text-right ${isEmployerInitiated ? 'amount-pos' : 'amount-neg'}`}>
                      {isEmployerInitiated ? '+' : '-'}₹{settlement.noticeAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
                <tr>
                  <td><strong>Bonus / Incentive Payout</strong></td>
                  <td>Q1 Performance Incentive Accrual</td>
                  <td className="text-right amount-pos">+₹{settlement.bonusAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td><strong>Loan / Advance Recovery</strong></td>
                  <td>Emergency Salary Advance Recovery</td>
                  <td className="text-right amount-neg">-₹{settlement.loanInputVal.toLocaleString('en-IN')}</td>
                </tr>
                {settlement.gratuityAmount > 0 && (
                  <tr>
                    <td><strong>Statutory Gratuity Payout</strong></td>
                    <td>(Basic / 26) * 15 * Years of Service</td>
                    <td className="text-right amount-pos">+₹{settlement.gratuityAmount.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                <tr>
                  <td><strong>TDS on Settlement</strong></td>
                  <td>Recalculated withholding</td>
                  <td className="text-right amount-neg">-₹{settlement.tdsAmount.toLocaleString('en-IN')}</td>
                </tr>
                {adhocs.map((a, i) => (
                  <tr key={i} className="bg-[#FFFBEB]">
                    <td><strong>Ad-hoc Adjustment</strong></td>
                    <td>{a.reason}</td>
                    <td className={`text-right ${a.amount < 0 ? 'amount-neg' : 'amount-pos'}`}>
                      {a.amount >= 0 ? '+' : ''}₹{Math.abs(a.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-6">
              {!showAdhoc ? (
                <Button variant="outline" onClick={() => setShowAdhoc(true)}>➕ Add Ad-hoc Adjustment</Button>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-md mt-4">
                  <h4 className="text-[0.9rem] text-[#1F3864] mb-3 font-bold">Insert Ad-hoc Settlement Adjustment</h4>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm">Amount (₹)</label>
                      <Input type="number" value={adhocAmount} onChange={e => setAdhocAmount(e.target.value)} />
                    </div>
                    <div className="flex-[2]">
                      <label className="text-sm">Reason / Explanation</label>
                      <Input value={adhocReason} onChange={e => setAdhocReason(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="navy" onClick={applyAdhoc}>Apply</Button>
                      <Button variant="secondary" onClick={() => setShowAdhoc(false)}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="settlement-total-box">
              <div>
                <div className="total-label">Net Final Settlement Amount</div>
                <div className="text-[0.85rem] opacity-80 mt-1">Payable to employee on full clearance verification</div>
              </div>
              <div className="total-amount">₹{settlement.finalNet.toLocaleString('en-IN')}</div>
            </div>

            <div className="wizard-footer">
              <Button variant="outline" onClick={() => goToStage(4)}>← Back to Exit Interview</Button>
              <div className="flex gap-4 items-center">
                {settlementStatus === 'draft' && (
                  <button className="btn-gold" onClick={() => {
                    setSettlementStatus('pending');
                    showToast({ message: 'Submitted for Admin Approval', type: 'info' });
                  }}>Submit for Approval</button>
                )}
                {settlementStatus === 'pending' && (
                  <Button variant="navy" onClick={() => {
                    setSettlementStatus('approved');
                    showToast({ message: 'Settlement Approved', type: 'success' });
                  }}>✓ Approve Settlement (Admin)</Button>
                )}
                {settlementStatus === 'approved' && (
                  <button className="btn-gold" onClick={() => completeStage(5)}>Next: Confirm Exit →</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage 6 */}
      {currentStage === 6 && (
        <div className="wizard-stage active animation-fadeIn">
          <div className="section-card">
            <div className="stage-header">
              <h3 className="stage-title">Stage 6: Final Exit Confirmation</h3>
              <Badge type="danger">Irreversible Action</Badge>
            </div>

            <div className="alert-banner green mb-6">
              ✓ <strong>Settlement Approved:</strong> Full & Final settlement has been verified and approved by Agency Admin.
            </div>

            <div className="bg-[#FFF5F5] border border-[#FEB2B2] border-l-4 border-l-[#DC2626] p-6 rounded-md mb-6">
              <h4 className="text-[1.2rem] text-[#DC2626] mb-3 font-bold">⚠ WARNING: Irreversible Security Execution</h4>
              <p className="text-[#7F1D1D] text-[0.95rem] leading-[1.6] mb-6">
                Clicking the button below will immediately revoke all active portal credentials, disable timesheet sync, flag the profile as Exited in the central payroll master, and queue the Full & Final settlement for banking disbursement.
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-[#FED7D7]">
                <div>
                  <strong className="text-[#991B1B] text-[1.05rem]">Employee: Aarav Sharma (TEC-088)</strong>
                  <div className="text-[0.85rem] text-[#B91C1C] mt-1">
                    Last Working Day: {lwd || 'Not set'} | Settlement: ₹{settlement.finalNet.toLocaleString('en-IN')}
                  </div>
                </div>
                <Button variant="danger" className="py-3 px-6 text-[1.05rem] font-bold shadow-[0_4px_12px_rgba(220,38,38,0.2)]" onClick={() => setConfirmExitModalOpen(true)}>
                  🚪 Confirm & Mark as Exited
                </Button>
              </div>
            </div>

            <div className="wizard-footer">
              <Button variant="outline" onClick={() => goToStage(5)}>← Back to Settlement</Button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 7 */}
      {currentStage === 7 && (
        <div className="wizard-stage active animation-fadeIn">
          <div className="section-card">
            <div className="stage-header">
              <h3 className="stage-title">Stage 7: Statutory Document Handover & Archival</h3>
              <Badge type="success">Exit Complete</Badge>
            </div>

            <div className="alert-banner green mb-6">
              ✓ <strong>Exit process complete.</strong> Aarav Sharma has been successfully moved to the Alumni record.
            </div>
            <div className="alert-banner info mb-8">
              ℹ️ <strong>Digital Delivery Note:</strong> Documents sent to personal email (aarav.sharma@gmail.com).
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="doc-card">
                <div>
                  <span className="text-[2.2rem] block mb-3">📄</span>
                  <h4>Relieving & Experience Letter</h4>
                  <p>Official statutory certificate confirming service tenure and designation.</p>
                </div>
                <div className="flex gap-2 border-t border-gray-200 pt-4 mt-4">
                  <Button variant="secondary" size="xs" className="flex-1">Preview</Button>
                  <Button variant="navy" size="xs" className="flex-1">📥 Download PDF</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Exit Process?">
        <p className="mb-6">Are you sure you want to cancel? Any unsaved changes in this wizard will be lost, and the employee will remain active.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>No, Keep Working</Button>
          <Link href="/employees/88" className="btn btn-danger">Yes, Cancel Process</Link>
        </div>
      </Modal>

      <Modal isOpen={confirmExitModalOpen} onClose={() => setConfirmExitModalOpen(false)} title="Confirm Formal Exit">
        <p className="mb-2">Are you absolutely sure you want to mark <strong>Aarav Sharma</strong> as Exited?</p>
        <ul className="list-disc pl-5 mb-6 text-sm text-gray-600">
          <li>Portal access will be instantly revoked.</li>
          <li>Settlement amount of ₹{settlement.finalNet.toLocaleString('en-IN')} will be queued for banking.</li>
          <li>Relieving letter will be auto-generated.</li>
        </ul>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmExitModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={executeExit}>Confirm Exit</Button>
        </div>
      </Modal>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
