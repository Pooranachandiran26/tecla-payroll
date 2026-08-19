import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import PageHeader from '../../../Components/ui/PageHeader';
import Stepper from '../../../Components/ui/Stepper';
import useToast from '../../../Hooks/useToast';

import ReportContext from './components/ReportContext';
import HistoryTable from './components/HistoryTable';
import StepPeriod from './steps/StepPeriod';
import StepPayrollSource from './steps/StepPayrollSource';
import StepReview from './steps/StepReview';
import StepPreview from './steps/StepPreview';
import StepDownload from './steps/StepDownload';

import { STEPS, deriveFormBContext } from './formBUtils';

export default function FormBWizard() {
  const { clients = [], history: initialHistory = [], allowEarlyFormBTesting = false } = usePage().props;
  const { showToast } = useToast();

  const [clientId, setClientId] = useState(clients.length === 1 ? clients[0].id : null);
  const [branchId, setBranchId] = useState(null);
  const [context, setContext] = useState(null);

  const [currentStep, setCurrentStep] = useState('period');
  const [completedSteps, setCompletedSteps] = useState([]);

  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('');
  const [periodSummary, setPeriodSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [runsData, setRunsData] = useState({ runs: [], has_locked_run: false });
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);

  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState(null);

  const [historyList, setHistoryList] = useState(initialHistory);

  const payrollMonth = year && month ? `${year}-${month}-01` : null;

  // Resolve context whenever client/branch selection changes. This Form B module is built and
  // legally verified only against the Tamil Nadu Labour Welfare Fund Rules, 1973 (Rule 29) —
  // there is no Karnataka/other-state implementation. deriveFormBContext() (formBUtils.js)
  // mirrors FormBGeneratorService::resolveContext() on the server, which is the actual
  // enforcement point; a non-Tamil-Nadu establishment must never be shown Tamil Nadu's Act/Rule
  // text here.
  useEffect(() => {
    if (!clientId) {
      setContext(null);
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setContext(null);
      return;
    }
    setContext(deriveFormBContext(client, branchId));
  }, [clientId, branchId, clients]);

  const resetFlow = () => {
    setCurrentStep('period');
    setCompletedSteps([]);
    setYear(String(new Date().getFullYear()));
    setMonth('');
    setPeriodSummary(null);
    setRunsData({ runs: [], has_locked_run: false });
    setSelectedRunId(null);
    setReviewData(null);
    setGeneratedBatch(null);
  };

  const handleClientChange = (newClientId) => {
    const changed = newClientId !== clientId;
    setClientId(newClientId);
    setBranchId(null); // a branch from the previous client is never valid for the new one
    if (changed) resetFlow();
  };

  const handleBranchChange = (newBranchId) => {
    const changed = newBranchId !== branchId;
    setBranchId(newBranchId);
    if (changed) resetFlow();
  };

  // Fetch period summary whenever month/year/context changes
  useEffect(() => {
    if (!context || !payrollMonth) return;
    setLoadingSummary(true);
    axios.post(route('compliance.form_b.period_summary'), {
      client_id: context.client_id,
      branch_id: context.branch_id,
      payroll_month: payrollMonth,
    })
      .then((res) => setPeriodSummary(res.data))
      .catch(() => setPeriodSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [context, payrollMonth]);

  const fetchPayrollRuns = useCallback(() => {
    if (!context || !payrollMonth) return;
    setLoadingRuns(true);
    axios.post(route('compliance.form_b.payroll_runs'), {
      client_id: context.client_id,
      branch_id: context.branch_id,
      payroll_month: payrollMonth,
    })
      .then((res) => {
        setRunsData(res.data);
        if (res.data.recommended_run_id) {
          setSelectedRunId(res.data.recommended_run_id);
        }
      })
      .catch(() => showToast({ type: 'danger', message: 'Failed to load payroll runs for this period.' }))
      .finally(() => setLoadingRuns(false));
  }, [context, payrollMonth]);

  const goToStep2 = () => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 'period'])));
    setCurrentStep('source');
    fetchPayrollRuns();
  };

  const goToStep3 = () => {
    if (!selectedRunId) return;
    setLoadingReview(true);
    axios.post(route('compliance.form_b.review'), {
      payroll_run_id: selectedRunId,
      branch_id: context.branch_id,
    })
      .then((res) => {
        setReviewData(res.data);
        setCompletedSteps((prev) => Array.from(new Set([...prev, 'source'])));
        setCurrentStep('review');
      })
      .catch((err) => {
        showToast({ type: 'danger', message: err?.response?.data?.error || 'Failed to load review data.' });
      })
      .finally(() => setLoadingReview(false));
  };

  const handleGenerateAndPreview = () => {
    if (!selectedRunId) return;
    setGenerating(true);
    axios.post(route('compliance.form_b.generate'), {
      payroll_run_id: selectedRunId,
      branch_id: context.branch_id,
    })
      .then((res) => {
        setGeneratedBatch(res.data.batch);
        setReviewData(res.data.preview);
        setCompletedSteps((prev) => Array.from(new Set([...prev, 'review'])));
        setCurrentStep('preview');
        axios.get(route('compliance.form_b.history')).then((r) => setHistoryList(r.data)).catch(() => {});
      })
      .catch((err) => {
        showToast({ type: 'danger', message: err?.response?.data?.error || 'Form B generation failed. Please try again.' });
      })
      .finally(() => setGenerating(false));
  };

  const handleDownload = (format) => {
    if (!generatedBatch) return;
    window.location.href = generatedBatch.download_urls[format];
  };

  const goToStep5 = () => {
    setCompletedSteps((prev) => Array.from(new Set([...prev, 'preview'])));
    setCurrentStep('download');
  };

  const handleHistoryDownload = (id, format) => {
    window.location.href = route('compliance.form_b.download', { id, format });
  };

  const handleHistoryDelete = (id) => {
    if (!window.confirm('Delete this Form B report from history? This cannot be undone.')) return;
    axios.delete(route('compliance.form_b.destroy', id))
      .then(() => {
        setHistoryList((prev) => prev.filter((h) => h.id !== id));
        showToast({ type: 'success', message: 'Form B report deleted.' });
      })
      .catch(() => showToast({ type: 'danger', message: 'Failed to delete report.' }));
  };

  const handleStepClick = (key) => {
    if (key === 'source' && completedSteps.includes('period')) setCurrentStep('source');
    if (key === 'review' && completedSteps.includes('source')) setCurrentStep('review');
    if (key === 'preview' && completedSteps.includes('review')) setCurrentStep('preview');
    if (key === 'download' && completedSteps.includes('preview')) setCurrentStep('download');
    if (key === 'period') setCurrentStep('period');
  };

  return (
    <AuthenticatedLayout>
      <Head title="Form B - Register of Wages" />

      <PageHeader
        title="Form B - Register of Wages"
        breadcrumbs={[
          { label: 'Compliance', url: route('compliance.index') },
          { label: 'Form B' },
        ]}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
        Register of Wages maintained under the Tamil Nadu Labour Welfare Fund Rules, 1973.
      </p>

      <ReportContext
        clients={clients}
        clientId={clientId}
        branchId={branchId}
        context={context}
        onClientChange={handleClientChange}
        onBranchChange={handleBranchChange}
      />

      {!context && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Select a client above to begin.
        </div>
      )}

      {context && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <Stepper
                steps={STEPS}
                currentKey={currentStep}
                completedKeys={completedSteps}
                onStepClick={handleStepClick}
              />
            </div>

            <div>
              {currentStep === 'period' && (
                <StepPeriod
                  year={year}
                  month={month}
                  onYearChange={setYear}
                  onMonthChange={setMonth}
                  summary={periodSummary}
                  loadingSummary={loadingSummary}
                  onNext={goToStep2}
                  context={context}
                  allowEarlyTesting={allowEarlyFormBTesting}
                />
              )}

              {currentStep === 'source' && (
                <StepPayrollSource
                  loading={loadingRuns}
                  runs={runsData.runs || []}
                  hasLockedRun={runsData.has_locked_run}
                  periodLabel={month && year ? `${monthLabel(month)} ${year}` : ''}
                  selectedRunId={selectedRunId}
                  onSelectRun={setSelectedRunId}
                  onBack={() => setCurrentStep('period')}
                  onNext={goToStep3}
                />
              )}

              {currentStep === 'review' && (
                loadingReview ? (
                  <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading review data...</div>
                ) : (
                  <StepReview
                    data={reviewData}
                    onBack={() => setCurrentStep('source')}
                    onNext={handleGenerateAndPreview}
                  />
                )
              )}

              {currentStep === 'preview' && (
                <StepPreview
                  data={reviewData}
                  batch={generatedBatch}
                  generating={generating}
                  onBack={() => setCurrentStep('review')}
                  onDownload={handleDownload}
                  onContinue={goToStep5}
                />
              )}

              {currentStep === 'download' && (
                <StepDownload
                  data={reviewData}
                  onDownload={handleDownload}
                  onBack={() => setCurrentStep('preview')}
                />
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <HistoryTable
              history={historyList}
              onDownload={handleHistoryDownload}
              onDelete={handleHistoryDelete}
            />
          </div>
        </>
      )}
    </AuthenticatedLayout>
  );
}

function monthLabel(monthValue) {
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return names[parseInt(monthValue, 10) - 1] || '';
}
