import React, { useState, useEffect } from 'react';
import './EmployeeExit.css';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Button from '@/Components/ui/Button';
import Select from '@/Components/ui/Select';
import Input from '@/Components/ui/Input';
import Badge from '@/Components/ui/Badge';
import Modal from '@/Components/ui/Modal';
import useToast from '@/Hooks/useToast';
import axios from 'axios';

import RoleGuard from '@/Components/RoleGuard';

const STEPS = [
  { id: 1, label: 'Initiate' },
  { id: 2, label: 'Notice Period' },
  { id: 3, label: 'Clearance' },
  { id: 4, label: 'Exit Interview' },
  { id: 5, label: 'Settlement' },
  { id: 6, label: 'Confirm Exit' },
  { id: 7, label: 'Documents' },
];

export default function EmployeeExit({ employee: rawEmployee, initialExitData }) {
  const employee = rawEmployee?.data || rawEmployee || {};
  const { showToast } = useToast();
  
  const [currentStage, setCurrentStage] = useState(initialExitData?.current_stage || 1);
  const [highestStageReached, setHighestStageReached] = useState(initialExitData?.current_stage || 1);
  
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [confirmExitModalOpen, setConfirmExitModalOpen] = useState(false);

  // Form states based on API fields
  // Stage 1
  const [exitType, setExitType] = useState(initialExitData?.exit_type || 'Resignation');
  const [reasonCategory, setReasonCategory] = useState(initialExitData?.reason_category || '');
  const [submissionDate, setSubmissionDate] = useState(initialExitData?.submission_date || '');
  const [discussed, setDiscussed] = useState(initialExitData?.discussed_with_employee ? 'yes' : 'no');
  const [discussionSummary, setDiscussionSummary] = useState(initialExitData?.discussion_summary || '');

  // Stage 2
  const [lwd, setLwd] = useState(initialExitData?.last_working_day || '');
  const [noticeAmountType, setNoticeAmountType] = useState(initialExitData?.notice_amount_type || 'none');
  const [noticeShortfallDays, setNoticeShortfallDays] = useState(initialExitData?.notice_shortfall_days || 0);
  
  // Stage 3
  const [clearances, setClearances] = useState({
    laptop: initialExitData?.clearance_laptop || '',
    idcard: initialExitData?.clearance_idcard || '',
    manager: initialExitData?.clearance_manager || '',
    itaccess: initialExitData?.clearance_itaccess || '',
    handover: initialExitData?.clearance_handover || '',
    client: initialExitData?.clearance_client || ''
  });

  // Stage 4
  const [interviewReason, setInterviewReason] = useState(initialExitData?.interview_reason || '');
  const [recommend, setRecommend] = useState(initialExitData?.would_recommend || 'yes');
  const [starRating, setStarRating] = useState(initialExitData?.star_rating || 4);

  // Stage 5
  const [unusedLeaves, setUnusedLeaves] = useState(initialExitData?.unused_leaves || 0);
  const [simLoan, setSimLoan] = useState(initialExitData?.loan_recovery_amount || '');
  const [bonusAmount, setBonusAmount] = useState(initialExitData?.bonus_amount || '');
  const [pendingSalaryAmount, setPendingSalaryAmount] = useState(initialExitData?.pending_salary_amount || '');
  const [tdsAmount, setTdsAmount] = useState(initialExitData?.tds_amount || '');
  
  const [showAdhoc, setShowAdhoc] = useState(false);
  const [adhocAmount, setAdhocAmount] = useState('');
  const [adhocReason, setAdhocReason] = useState('');
  const [adhocs, setAdhocs] = useState(initialExitData?.adhoc_adjustments || []);
  
  const [settlementStatus, setSettlementStatus] = useState(initialExitData?.settlement_status || 'draft');
  const [settlementPreview, setSettlementPreview] = useState(null);
  const [gratuityForfeitureConfirmed, setGratuityForfeitureConfirmed] = useState(false);
  const [epfoChecklistDone, setEpfoChecklistDone] = useState(false);

  // Derived Values
  const isEmployerInitiated = exitType === 'Termination' || exitType === 'Client-Initiated';
  
  useEffect(() => {
    // Stage 2 derived values
    if (submissionDate && lwd) {
      const diffTime = new Date(lwd) - new Date(submissionDate);
      let servedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (servedDays < 0) servedDays = 0;
      
      const requiredNotice = employee.notice_period_days || 30;
      let shortfall = requiredNotice - servedDays;
      if (shortfall < 0) shortfall = 0;
      
      setNoticeShortfallDays(shortfall);
      if (shortfall > 0) {
          setNoticeAmountType(isEmployerInitiated ? 'addition' : 'deduction');
      } else {
          setNoticeAmountType('none');
      }
    }
  }, [submissionDate, lwd, isEmployerInitiated, employee.notice_period_days]);

  useEffect(() => {
    if (currentStage === 5) {
      fetchSettlementPreview();
    }
  }, [currentStage, unusedLeaves, simLoan, bonusAmount, pendingSalaryAmount, tdsAmount, adhocs, lwd, noticeShortfallDays, noticeAmountType]);

  const fetchSettlementPreview = async () => {
    try {
      const payload = {
        exit_type: exitType,
        reason_category: reasonCategory,
        last_working_day: lwd,
        notice_shortfall_days: noticeShortfallDays,
        notice_amount_type: noticeAmountType,
        unused_leaves: unusedLeaves,
        loan_recovery_amount: simLoan || 0,
        bonus_amount: bonusAmount || 0,
        pending_salary_amount: pendingSalaryAmount || 0,
        tds_amount: tdsAmount || 0,
        adhoc_adjustments: adhocs
      };
      const res = await axios.post(route('employees.exit.preview', employee.id), payload);
      setSettlementPreview(res.data);
      // Auto-fill bonus input with statutory amount if user hasn't manually set it
      if (res.data.statutory_bonus_eligible && (!bonusAmount || bonusAmount === '0' || bonusAmount === 0)) {
        setBonusAmount(res.data.statutory_bonus_amount);
      }
    } catch (e) {
      console.error(e);
      showToast({ message: 'Error calculating settlement preview', type: 'error' });
    }
  };

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

  const completeStage = async (stageNum, extraData = {}) => {
    try {
      let payload = {};
      switch (stageNum) {
        case 1:
          payload = { exit_type: exitType, reason_category: reasonCategory, submission_date: submissionDate, discussed_with_employee: discussed === 'yes', discussion_summary: discussionSummary };
          break;
        case 2:
          payload = { last_working_day: lwd, notice_shortfall_days: noticeShortfallDays, notice_amount_type: noticeAmountType };
          break;
        case 3:
          payload = {
            clearance_laptop: clearances.laptop,
            clearance_idcard: clearances.idcard,
            clearance_manager: clearances.manager,
            clearance_itaccess: clearances.itaccess,
            clearance_handover: clearances.handover,
            clearance_client: clearances.client,
          };
          break;
        case 4:
          payload = { interview_reason: interviewReason, would_recommend: recommend, star_rating: starRating };
          break;
        case 5:
          payload = { 
            last_working_day: lwd, notice_shortfall_days: noticeShortfallDays, notice_amount_type: noticeAmountType,
            unused_leaves: unusedLeaves, loan_recovery_amount: simLoan || 0, bonus_amount: bonusAmount || 0, 
            pending_salary_amount: pendingSalaryAmount || 0, tds_amount: tdsAmount || 0, adhoc_adjustments: adhocs,
            is_submitting_for_approval: extraData.submitForApproval || false
          };
          break;
      }
      
      const res = await axios.post(route('employees.exit.stage', { id: employee.id, stage: stageNum }), payload);
      
      if (extraData.submitForApproval) {
          setSettlementStatus('pending_approval');
      }

      const nextStage = extraData.submitForApproval ? 6 : stageNum + 1;
      if (nextStage > highestStageReached) {
        setHighestStageReached(nextStage);
      }
      goToStage(nextStage);
    } catch (e) {
      console.error(e);
      showToast({ message: e.response?.data?.message || 'Error saving stage', type: 'error' });
    }
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

  const approveSettlement = async () => {
    try {
      await axios.post(route('employees.exit.approve', employee.id));
      setSettlementStatus('approved');
      showToast({ message: 'Settlement Approved', type: 'success' });
      const nextStage = 6;
      setHighestStageReached(nextStage);
      goToStage(nextStage);
    } catch (e) {
        showToast({ message: e.response?.data?.message || 'Error approving settlement', type: 'error' });
    }
  };

  const executeExit = async () => {
    try {
      await axios.post(route('employees.exit.confirm', employee.id));
      setConfirmExitModalOpen(false);
      showToast({ message: 'Employee Exit Confirmed', type: 'success' });
      setHighestStageReached(7);
      goToStage(7);
    } catch (e) {
      showToast({ message: e.response?.data?.message || 'Error confirming exit', type: 'error' });
    }
  };

  const requiredNotice = employee.notice_period_days || 30;
  let servedDays = 0;
  if (submissionDate && lwd) {
      const diffTime = new Date(lwd) - new Date(submissionDate);
      servedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (servedDays < 0) servedDays = 0;
  }

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title={`Employee Exit - ${employee.full_name}`} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href={route('employees.show', employee.id)} className="text-[0.85rem] font-semibold text-[#1F3864] hover:underline">
            ← Back to {employee.full_name}'s Profile
          </Link>
          <h2 className="text-2xl font-bold text-[#1F3864] mt-2 mb-1">Employee Exit & Full & Final Workflow</h2>
          <p className="text-gray-500 text-sm">Guided multi-stage exit wizard for <strong>{employee.full_name} ({employee.employee_code})</strong></p>
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
                <p className="field-note">Select who initiated the exit. This controls notice pay rules — employee-initiated exits may have notice shortfall deductions; employer/client-initiated exits receive Notice Pay in Lieu.</p>
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
                <p className="field-note">Secondary classification for attrition analytics and HR compliance records. Options auto-filter based on the Exit Type selected above.</p>
              </div>
            </div>

            <div className="form-row mt-4">
              <div className="form-group flex-1">
                <label>Submission / Notice Date</label>
                <Input type="date" value={submissionDate} onChange={e => setSubmissionDate(e.target.value)} />
                <p className="field-note">The date the employee formally submitted the resignation letter, or the date the termination letter was issued. Used as the start point to calculate notice days served in Stage 2.</p>
              </div>
              <div className="form-group flex-1"></div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="font-semibold block mb-2 text-[#1F3864]">Was this exit discussed with the employee in advance?</label>
              <p className="field-note mb-3">Compliance acknowledgment confirming whether a pre-exit counselling session was conducted. Especially important for employer-initiated exits to mitigate Sec 25-F Industrial Disputes Act exposure.</p>
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
                  <p className="field-note">Briefly note key points from the exit discussion. This is stored as an internal HR audit record and is not shared with the employee.</p>
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
              ℹ️ <strong>Contractual Notice Required:</strong> <span className="font-bold ml-1">{requiredNotice} Days</span> (pulled from current active employment agreement).
            </div>

            <div className="form-row mt-6">
              <div className="form-group flex-1">
                <label>Last Working Day (LWD)</label>
                <Input type="date" value={lwd} onChange={e => setLwd(e.target.value)} />
                <p className="field-note">The employee's final physical working date. Combined with the Submission Date to auto-calculate days of notice served and any shortfall recovery in the Full & Final Settlement.</p>
              </div>
              <div className="form-group flex-1">
                <label>Calculated Notice Period Status</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[0.95rem] font-semibold">
                  {noticeShortfallDays > 0 ? (
                    isEmployerInitiated 
                      ? `Notice Served: ${servedDays} days | Notice Pay in Lieu: ${noticeShortfallDays} days`
                      : `Notice Served: ${servedDays} days | Shortfall: ${noticeShortfallDays} days`
                  ) : (
                    `Notice Served: ${servedDays} days | Shortfall: 0 days`
                  )}
                </div>
              </div>
            </div>

            {noticeShortfallDays > 0 && isEmployerInitiated && (
              <div className="alert-banner info mt-4">
                ℹ️ <strong>Notice Pay in Lieu:</strong> Since this is an employer/client-initiated exit ({exitType}) with a notice shortfall of {noticeShortfallDays} days, the agency will provide Notice Pay in Lieu to the employee in the final settlement.
              </div>
            )}
            {noticeShortfallDays > 0 && !isEmployerInitiated && (
              <div className="alert-banner amber mt-4">
                ⚠ <strong>Notice Shortfall Recovery:</strong> Employee is serving {servedDays} days against the required {requiredNotice} days. A shortfall recovery for {noticeShortfallDays} days will be deducted in the final settlement.
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
              <p className="field-note">In the employee's own words — explain why they are leaving and any feedback for the organization. Used for internal attrition analytics and HR improvement initiatives. Not shared externally.</p>
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
                <p className="field-note">Net Promoter Signal — helps track employer brand health and alumni loyalty over time across departments.</p>
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
                <p className="field-note">Aggregated ratings are tracked in HR dashboards to monitor department-level and client-level employee satisfaction trends.</p>
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
                {settlementStatus === 'draft' ? 'Draft Computation' : settlementStatus === 'pending_approval' ? 'Pending Approval' : 'Approved'}
              </Badge>
            </div>

            <div className="bg-slate-50 border border-slate-300 p-5 rounded-md mb-2">
              <div className="text-[0.85rem] font-bold text-[#1F3864] mb-4">⚙️ Settlement Inputs</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="text-[0.82rem] font-semibold text-[#1F3864] block mb-1">Unused Leaves <span className="text-gray-400 font-normal">(days)</span></label>
                  <Input type="number" value={unusedLeaves} onChange={e => setUnusedLeaves(e.target.value)} />
                  <p className="field-note">Accrued earned/privilege leaves not taken. Encashment = (Basic ÷ 26) × days.</p>
                </div>
                <div className="form-group">
                  <label className="text-[0.82rem] font-semibold text-[#1F3864] block mb-1">Bonus Amount <span className="text-gray-400 font-normal">(₹)</span></label>
                  <Input type="number" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} />
                  <p className="field-note">Performance bonus or statutory bonus at exit. Auto-filled if eligible under Payment of Bonus Act.</p>
                </div>
                <div className="form-group">
                  <label className="text-[0.82rem] font-semibold text-[#1F3864] block mb-1">Pro-rated Salary <span className="text-gray-400 font-normal">(₹)</span></label>
                  <Input type="number" value={pendingSalaryAmount} onChange={e => setPendingSalaryAmount(e.target.value)} />
                  <p className="field-note">Salary for the partial exit month (1st to LWD). Calculate: Gross ÷ LOP basis days × days worked.</p>
                </div>
                <div className="form-group">
                  <label className="text-[0.82rem] font-semibold text-[#1F3864] block mb-1">Loan Recovery <span className="text-gray-400 font-normal">(₹)</span></label>
                  <Input type="number" value={simLoan} onChange={e => setSimLoan(e.target.value)} />
                  <p className="field-note">Outstanding loan/advance balance to be recovered. Enter ₹0 if no active loan.</p>
                </div>
                <div className="form-group">
                  <label className="text-[0.82rem] font-semibold text-[#1F3864] block mb-1">TDS Adjustment <span className="text-gray-400 font-normal">(₹)</span></label>
                  <Input type="number" value={tdsAmount} onChange={e => setTdsAmount(e.target.value)} />
                  <p className="field-note">TDS on settlement components (bonus, leave encashment) under Sec 192. Enter ₹0 if already deducted via payroll.</p>
                </div>
              </div>
            </div>
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-[0.8rem] text-blue-800 leading-relaxed">
              <strong>📌 Input Guide:</strong>&nbsp;
              <strong>Unused Leaves</strong> — No. of accrued earned/privilege leaves not taken; encashment = (Basic ÷ 26) × days.&nbsp;
              <strong>Bonus</strong> — Any performance or contractual payout due at exit.&nbsp;
              <strong>Pro-rated Salary</strong> — Manually enter salary for the partial exit month (1st to LWD).&nbsp;
              <strong>Loan Recovery</strong> — Outstanding loan/advance balance to be deducted; enter ₹0 if none.&nbsp;
              <strong>TDS Adj</strong> — Tax to be withheld on settlement components like bonus/leave encashment under Sec 192; enter ₹0 if already deducted via payroll.
            </div>

            {settlementPreview ? (
            <>
            {/* Statutory Bonus Auto-Computation Banner */}
            {settlementPreview.statutory_bonus_eligible && (
              <div className="alert-banner green mb-4">
                ✓ <strong>Statutory Bonus Auto-Computed (Payment of Bonus Act 1965):</strong> This employee's Basic Pay (≤ ₹21,000) makes them eligible. Calculated as min(Basic, ₹7,000 ceiling) × bonus rate% × months worked in this FY = <strong>₹{Number(settlementPreview.statutory_bonus_amount).toLocaleString('en-IN')}</strong>. Pre-filled in Bonus Amount field — override if a different rate applies.
              </div>
            )}

            {/* Sec 4(6) Gratuity Forfeiture Advisory */}
            {settlementPreview.gratuity_forfeiture_risk && (
              <div className="bg-[#FFF5F5] border border-[#FEB2B2] border-l-4 border-l-[#DC2626] p-4 rounded-md mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-[1.4rem]">⚖️</span>
                  <div className="flex-1">
                    <h4 className="text-[0.95rem] font-bold text-[#991B1B] mb-1">Gratuity Forfeiture Advisory — Sec 4(6), Payment of Gratuity Act 1972</h4>
                    <p className="text-[0.82rem] text-[#7F1D1D] leading-relaxed mb-3">
                      This exit is recorded as <strong>Termination — Conduct / Policy Violation</strong>. Under Sec 4(6), gratuity <em>may</em> be forfeited only when termination is due to <strong>riotous or violent conduct</strong> or an <strong>offense involving moral turpitude</strong>. A generic policy violation does NOT automatically qualify. Please consult your legal/HR team before reducing the gratuity amount.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gratuityForfeitureConfirmed}
                        onChange={e => setGratuityForfeitureConfirmed(e.target.checked)}
                        className="w-4 h-4 accent-red-600"
                      />
                      <span className="text-[0.82rem] font-semibold text-[#991B1B]">
                        I acknowledge this advisory and confirm the gratuity amount shown below has been reviewed by legal/HR.
                      </span>
                    </label>
                  </div>
                </div>
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
                  <td>Entered manual pro-ration amount</td>
                  <td className="text-right amount-pos">+₹{Number(settlementPreview.pending_salary_amount).toLocaleString('en-IN')}</td>
                </tr>
                {settlementPreview.leave_encashment_amount > 0 && (
                <tr>
                  <td><strong>Leave Encashment</strong></td>
                  <td>{unusedLeaves} Accrued Unused Earned Leaves</td>
                  <td className="text-right amount-pos">+₹{Number(settlementPreview.leave_encashment_amount).toLocaleString('en-IN')}</td>
                </tr>
                )}
                {noticeShortfallDays > 0 && settlementPreview.notice_amount > 0 && (
                  <tr>
                    <td><strong>{isEmployerInitiated ? 'Notice Pay in Lieu (Addition)' : 'Notice Period Shortfall Recovery'}</strong></td>
                    <td>{isEmployerInitiated ? `Agency providing pay in lieu for ${noticeShortfallDays} days notice shortfall` : `Shortfall deduction for ${noticeShortfallDays} days unserved notice`}</td>
                    <td className={`text-right ${isEmployerInitiated ? 'amount-pos' : 'amount-neg'}`}>
                      {isEmployerInitiated ? '+' : '-'}₹{Number(settlementPreview.notice_amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
                {settlementPreview.bonus_amount > 0 && (
                <tr>
                  <td><strong>Bonus / Incentive Payout</strong></td>
                  <td>Entered Amount</td>
                  <td className="text-right amount-pos">+₹{Number(settlementPreview.bonus_amount).toLocaleString('en-IN')}</td>
                </tr>
                )}
                {settlementPreview.loan_recovery_amount > 0 && (
                <tr>
                  <td><strong>Loan / Advance Recovery</strong></td>
                  <td>Entered Amount</td>
                  <td className="text-right amount-neg">-₹{Number(settlementPreview.loan_recovery_amount).toLocaleString('en-IN')}</td>
                </tr>
                )}
                {settlementPreview.gratuity_amount > 0 && (
                  <tr>
                    <td><strong>Statutory Gratuity Payout</strong></td>
                    <td>Eligible (&gt;= 4 Years, 240 Days)</td>
                    <td className="text-right amount-pos">+₹{Number(settlementPreview.gratuity_amount).toLocaleString('en-IN')}</td>
                  </tr>
                )}
                {settlementPreview.tds_amount > 0 && (
                <tr>
                  <td><strong>TDS on Settlement</strong></td>
                  <td>Entered adjustment</td>
                  <td className="text-right amount-neg">-₹{Number(settlementPreview.tds_amount).toLocaleString('en-IN')}</td>
                </tr>
                )}
                {Number(settlementPreview.pt_shortfall_recovery || 0) > 0 && (
                <tr className="bg-[#FEF3C7]">
                  <td><strong>Professional Tax (PT) Shortfall Recovery</strong></td>
                  <td>Statutory Half-Yearly Cycle Reconciliation ({employee.client?.pt_state || 'TN'})</td>
                  <td className="text-right amount-neg font-bold text-[#D97706]">-₹{Number(settlementPreview.pt_shortfall_recovery).toLocaleString('en-IN')}</td>
                </tr>
                )}
                {adhocs.map((a, i) => (
                  <tr key={i} className="bg-[#FFFBEB]">
                    <td><strong>Ad-hoc Adjustment</strong></td>
                    <td>{a.reason}</td>
                    <td className={`text-right ${a.amount < 0 ? 'amount-neg' : 'amount-pos'}`}>
                      {a.amount >= 0 ? '+' : ''}₹{Math.abs(a.amount).toLocaleString('en-IN')}
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
              <div className="total-amount">₹{Number(settlementPreview.net_settlement_amount).toLocaleString('en-IN')}</div>
            </div>
            </>
            ) : (
                <div className="p-4 text-center">Loading Preview...</div>
            )}

            <div className="wizard-footer">
              <Button variant="outline" onClick={() => goToStage(4)}>← Back to Exit Interview</Button>
              <div className="flex gap-4 items-center">
                {settlementStatus === 'draft' && (
                  <>
                  <Button variant="outline" onClick={() => completeStage(5, { submitForApproval: false })}>Save Draft</Button>
                  <button className="btn-gold" onClick={() => {
                    completeStage(5, { submitForApproval: true });
                  }}>Submit for Approval</button>
                  </>
                )}
                {settlementStatus === 'pending_approval' && (
                  <RoleGuard allowedRoles={['admin']}>
                    <Button variant="navy" onClick={approveSettlement}>✓ Approve Settlement (Admin)</Button>
                  </RoleGuard>
                )}
                {settlementStatus === 'approved' && (
                  <button className="btn-gold" onClick={() => goToStage(6)}>Next: Confirm Exit →</button>
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
                  <strong className="text-[#991B1B] text-[1.05rem]">Employee: {employee.full_name} ({employee.employee_code})</strong>
                  <div className="text-[0.85rem] text-[#B91C1C] mt-1">
                    Last Working Day: {lwd || 'Not set'} | Settlement: ₹{Number(settlementPreview?.net_settlement_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <RoleGuard allowedRoles={['admin']}>
                <Button variant="danger" className="py-3 px-6 text-[1.05rem] font-bold shadow-[0_4px_12px_rgba(220,38,38,0.2)]" onClick={() => setConfirmExitModalOpen(true)}>
                  🚪 Confirm & Mark as Exited
                </Button>
                </RoleGuard>
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
              ✓ <strong>Exit process complete.</strong> {employee.full_name} has been successfully moved to the Alumni record.
            </div>
            <div className="alert-banner info mb-8">
              ℹ️ <strong>Digital Delivery Note:</strong> Documents sent to personal email ({employee.personal_email}).
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

              <div className="doc-card">
                <div>
                  <span className="text-[2.2rem] block mb-3">🏦</span>
                  <h4>EPFO Form 19 — PF Final Settlement</h4>
                  <p>Employee must submit Form 19 to EPFO to withdraw Provident Fund balance (or transfer via Form 13). Initiate within 2 months of exit.</p>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-[0.8rem] font-semibold text-[#1F3864]">
                    <input
                      type="checkbox"
                      checked={epfoChecklistDone}
                      onChange={e => setEpfoChecklistDone(e.target.checked)}
                      className="w-4 h-4 accent-[#1F3864]"
                    />
                    Intimated employee to file Form 19 / Form 13 at EPFO member portal
                  </label>
                </div>
              </div>

              <div className="doc-card">
                <div>
                  <span className="text-[2.2rem] block mb-3">🏛️</span>
                  <h4>EPFO Form 10C — EPS Withdrawal / Scheme Certificate</h4>
                  <p>Required for EPS (Pension) withdrawal if service is less than 10 years. For service ≥ 10 years, employee receives a Scheme Certificate instead. Submit jointly with Form 19.</p>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-[0.75rem] text-gray-500">ℹ Form 10C is filed jointly with Form 19 at <strong>epfindia.gov.in</strong> → Member Services → Claim (Form 19 & 10C)</p>
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
          <Link href={route('employees.show', employee.id)} className="btn btn-danger">Yes, Cancel Process</Link>
        </div>
      </Modal>

      <Modal isOpen={confirmExitModalOpen} onClose={() => setConfirmExitModalOpen(false)} title="Confirm Formal Exit">
        <p className="mb-2">Are you absolutely sure you want to mark <strong>{employee.full_name}</strong> as Exited?</p>
        <ul className="list-disc pl-5 mb-6 text-sm text-gray-600">
          <li>Portal access will be instantly revoked.</li>
          <li>Settlement amount of ₹{Number(settlementPreview?.net_settlement_amount || 0).toLocaleString('en-IN')} will be queued for banking.</li>
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
