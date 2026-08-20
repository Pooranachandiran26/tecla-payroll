import { Head, Link, router, usePage } from '@inertiajs/react';
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

  // Client Audit Pack Modal & Feature State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditBatches, setAuditBatches] = useState([]);
  const [selectedAuditClientId, setSelectedAuditClientId] = useState('');
  const [selectedAuditPeriod, setSelectedAuditPeriod] = useState('');
  const [auditGenerating, setAuditGenerating] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [lastAuditResult, setLastAuditResult] = useState(null);

  const fetchAuditHistory = async () => {
    try {
      const response = await axios.get(route('compliance.audit_pack.clients'));
      setAuditBatches(response.data.batches || []);
    } catch (err) {
      // non-fatal
    }
  };

  useEffect(() => {
    if (isAuditModalOpen) {
      setAuditError('');
      setLastAuditResult(null);
      fetchAuditHistory();
    }
  }, [isAuditModalOpen]);

  const handleGenerateAuditPack = async () => {
    if (!selectedAuditClientId || !selectedAuditPeriod) {
      setAuditError('Select a client and a period.');
      return;
    }
    setAuditGenerating(true);
    setAuditError('');
    try {
      const response = await axios.post(route('compliance.audit_pack.generate'), {
        client_id: selectedAuditClientId,
        period: selectedAuditPeriod,
      });
      if (response.data.success) {
        showToast('🎉 Client Audit Pack generated.');
        setLastAuditResult(response.data);
        fetchAuditHistory();
      }
    } catch (err) {
      setAuditError(err.response?.data?.message || 'Audit pack generation failed.');
    } finally {
      setAuditGenerating(false);
    }
  };

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
  const [esiReasonCodes, setEsiReasonCodes] = useState([]);
  const [esiZeroDayEmployees, setEsiZeroDayEmployees] = useState([]);
  const [esiReasonSelections, setEsiReasonSelections] = useState({});
  const [esiPreviewData, setEsiPreviewData] = useState(null);

  // Quick Statutory Code Configuration Modal State (PF & ESI)
  const [isStatutoryCodeModalOpen, setIsStatutoryCodeModalOpen] = useState(false);
  const [statutoryCodeType, setStatutoryCodeType] = useState('pf'); // 'pf' | 'esi'
  const [statutoryClientId, setStatutoryClientId] = useState('');
  const [statutoryClientName, setStatutoryClientName] = useState('');
  const [statutoryCodeValue, setStatutoryCodeValue] = useState('');
  const [statutoryCodeSaving, setStatutoryCodeSaving] = useState(false);

  const openConfigureStatutoryCode = (type, clientId, clientName, currentValue = '') => {
    setStatutoryCodeType(type);
    setStatutoryClientId(clientId || '');
    setStatutoryClientName(clientName || '');
    setStatutoryCodeValue(currentValue || '');
    setIsStatutoryCodeModalOpen(true);
  };

  const handleSaveStatutoryCode = async () => {
    if (!statutoryClientId) {
      showToast('⚠️ No client identified.', 'error');
      return;
    }
    if (!statutoryCodeValue.trim()) {
      showToast(`⚠️ Please enter a valid ${statutoryCodeType === 'pf' ? 'PF Establishment Code' : 'ESI Code Number'}.`, 'error');
      return;
    }

    setStatutoryCodeSaving(true);
    try {
      const payload = { client_id: statutoryClientId };
      if (statutoryCodeType === 'pf') {
        payload.pf_establishment_code = statutoryCodeValue.trim();
      } else {
        payload.esi_code_number = statutoryCodeValue.trim();
      }

      const response = await axios.post(route('compliance.client.update_statutory_code'), payload);
      if (response.data.success) {
        showToast(`🎉 ${statutoryCodeType === 'pf' ? 'PF Establishment Code' : 'ESI Code Number'} saved for ${statutoryClientName || 'client'}!`);
        setIsStatutoryCodeModalOpen(false);

        // Instant refresh of the active generator preview
        if (statutoryCodeType === 'pf') {
          fetchEcrRuns(monthFilter);
          if (selectedRunId) {
            handlePreviewEcr(selectedRunId);
          }
        } else {
          fetchEsiRuns();
          if (selectedEsiRunId) {
            handlePreviewEsi(selectedEsiRunId);
          }
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update statutory code.';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setStatutoryCodeSaving(false);
    }
  };

  const fetchEsiRuns = async () => {
    setEsiLoadingRuns(true);
    try {
      const [runsRes, reasonRes] = await Promise.all([
        axios.get(route('compliance.esi_monthly.runs')),
        axios.get(route('compliance.esi_monthly.reason_codes')),
      ]);
      const fetchedRuns = runsRes.data.runs || [];
      setEsiRuns(fetchedRuns);
      setEsiBatches(runsRes.data.batches || []);
      setEsiReasonCodes(reasonRes.data.codes || []);
      const firstId = fetchedRuns.length > 0 ? String(fetchedRuns[0].id) : '';
      setSelectedEsiRunId(firstId);
      if (firstId) handlePreviewEsi(firstId);
    } catch (err) {
      showToast('❌ Failed to fetch locked payroll runs for ESI Monthly Contribution.', 'error');
    } finally {
      setEsiLoadingRuns(false);
    }
  };

  const handlePreviewEsi = async (runIdToPreview) => {
    const targetId = runIdToPreview || selectedEsiRunId;
    if (!targetId) return;
    setEsiZeroDayEmployees([]);
    setEsiReasonSelections({});
    try {
      const response = await axios.post(route('compliance.esi_monthly.preview'), {
        payroll_run_id: targetId
      });
      setEsiPreviewData(response.data);
      setEsiZeroDayEmployees(response.data.zero_day_employees || []);
    } catch (err) {
      setEsiPreviewData(null);
    }
  };

  useEffect(() => {
    if (isEsiModalOpen) {
      setLastEsiBatch(null);
      setEsiError('');
      fetchEsiRuns();
    }
  }, [isEsiModalOpen]);

  const handleEsiReasonChange = (employeeId, code) => {
    setEsiReasonSelections(prev => ({ ...prev, [employeeId]: code === '' ? undefined : Number(code) }));
  };

  const handleGenerateEsi = async () => {
    if (!selectedEsiRunId) return;

    const missing = esiZeroDayEmployees.filter(e => esiReasonSelections[e.employee_id] === undefined);
    if (missing.length > 0) {
      setEsiError(`Select a Reason for 0 Wages for: ${missing.map(e => e.employee_name).join(', ')}`);
      return;
    }

    setEsiGenerating(true);
    setEsiError('');
    try {
      const response = await axios.post(route('compliance.esi_monthly.generate'), {
        payroll_run_id: selectedEsiRunId,
        reasons: esiReasonSelections,
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

  // PT Challan Modal & Feature State
  const [isPtModalOpen, setIsPtModalOpen] = useState(false);
  const [ptLoadingRuns, setPtLoadingRuns] = useState(false);
  const [ptRuns, setPtRuns] = useState([]);
  const [ptBatches, setPtBatches] = useState([]);
  const [selectedPtRunId, setSelectedPtRunId] = useState('');
  const [ptGenerating, setPtGenerating] = useState(false);
  const [lastPtBatch, setLastPtBatch] = useState(null);
  const [ptError, setPtError] = useState('');
  const [ptPreviewData, setPtPreviewData] = useState(null);

  const fetchPtRuns = async () => {
    setPtLoadingRuns(true);
    try {
      const response = await axios.get(route('compliance.pt_challan.runs'));
      const fetchedRuns = response.data.runs || [];
      setPtRuns(fetchedRuns);
      setPtBatches(response.data.batches || []);
      if (fetchedRuns.length > 0) {
        const firstId = String(fetchedRuns[0].id);
        setSelectedPtRunId(firstId);
        handlePreviewPt(firstId);
      } else {
        setSelectedPtRunId('');
        setPtPreviewData(null);
      }
    } catch (err) {
      showToast('❌ Failed to fetch locked payroll runs for PT Challan.', 'error');
    } finally {
      setPtLoadingRuns(false);
    }
  };

  const handlePreviewPt = async (runIdToPreview) => {
    const targetId = runIdToPreview || selectedPtRunId;
    if (!targetId) return;
    try {
      const response = await axios.post(route('compliance.pt_challan.preview'), {
        payroll_run_id: targetId
      });
      setPtPreviewData(response.data);
    } catch (err) {
      setPtPreviewData(null);
    }
  };

  useEffect(() => {
    if (isPtModalOpen) {
      setLastPtBatch(null);
      setPtError('');
      fetchPtRuns();
    }
  }, [isPtModalOpen]);

  const handleGeneratePt = async () => {
    if (!selectedPtRunId) return;
    setPtGenerating(true);
    setPtError('');
    try {
      const response = await axios.post(route('compliance.pt_challan.generate'), {
        payroll_run_id: selectedPtRunId
      });
      if (response.data.success) {
        showToast('🎉 PT State-wise Challan Report (.xlsx) generated successfully!');
        setLastPtBatch(response.data);
        fetchPtRuns();
      }
    } catch (err) {
      const errorList = err.response?.data?.errors?.pt;
      const errorMsg = Array.isArray(errorList) ? errorList.join(' ') : (err.response?.data?.message || 'PT report generation failed.');
      setPtError(errorMsg);
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setPtGenerating(false);
    }
  };

  // GSTR-1 Modal & Feature State
  const [isGstr1ModalOpen, setIsGstr1ModalOpen] = useState(false);
  const [gstr1LoadingMonths, setGstr1LoadingMonths] = useState(false);
  const [gstr1Months, setGstr1Months] = useState([]);
  const [gstr1Batches, setGstr1Batches] = useState([]);
  const [selectedGstr1Month, setSelectedGstr1Month] = useState('');
  const [gstr1Generating, setGstr1Generating] = useState(false);
  const [lastGstr1Batch, setLastGstr1Batch] = useState(null);
  const [gstr1Error, setGstr1Error] = useState('');
  const [gstr1PreviewData, setGstr1PreviewData] = useState(null);

  const fetchGstr1Months = async () => {
    setGstr1LoadingMonths(true);
    try {
      const response = await axios.get(route('compliance.gstr1.months'));
      const fetchedMonths = response.data.months || [];
      setGstr1Months(fetchedMonths);
      setGstr1Batches(response.data.batches || []);
      if (fetchedMonths.length > 0) {
        setSelectedGstr1Month(fetchedMonths[0]);
        handlePreviewGstr1(fetchedMonths[0]);
      } else {
        setSelectedGstr1Month('');
        setGstr1PreviewData(null);
      }
    } catch (err) {
      showToast('❌ Failed to fetch available invoice months for GSTR-1.', 'error');
    } finally {
      setGstr1LoadingMonths(false);
    }
  };

  const handlePreviewGstr1 = async (monthToPreview) => {
    const targetMonth = monthToPreview || selectedGstr1Month;
    if (!targetMonth) return;
    try {
      const response = await axios.post(route('compliance.gstr1.preview'), {
        return_period: targetMonth
      });
      setGstr1PreviewData(response.data);
    } catch (err) {
      setGstr1PreviewData(null);
    }
  };

  useEffect(() => {
    if (isGstr1ModalOpen) {
      setLastGstr1Batch(null);
      setGstr1Error('');
      fetchGstr1Months();
    }
  }, [isGstr1ModalOpen]);

  const handleGenerateGstr1 = async () => {
    if (!selectedGstr1Month) return;
    setGstr1Generating(true);
    setGstr1Error('');
    try {
      const response = await axios.post(route('compliance.gstr1.generate'), {
        return_period: selectedGstr1Month
      });
      if (response.data.success) {
        showToast('🎉 GSTR-1 Official JSON & Excel Summary generated successfully!');
        setLastGstr1Batch(response.data);
        fetchGstr1Months();
      }
    } catch (err) {
      const errorList = err.response?.data?.errors?.gstr1;
      const errorMsg = Array.isArray(errorList) ? errorList.join(' ') : (err.response?.data?.message || 'GSTR-1 generation failed.');
      setGstr1Error(errorMsg);
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setGstr1Generating(false);
    }
  };

  // TDS Form 24Q Modal & Feature State
  const [isTdsModalOpen, setIsTdsModalOpen] = useState(false);
  const [tdsLoadingMetadata, setTdsLoadingMetadata] = useState(false);
  const [tdsClients, setTdsClients] = useState([]);
  const [tdsBatches, setTdsBatches] = useState([]);
  const [selectedTdsClient, setSelectedTdsClient] = useState('');
  const [selectedTdsFy, setSelectedTdsFy] = useState('2026-2027');
  const [selectedTdsQuarter, setSelectedTdsQuarter] = useState('Q1');
  const [tdsGenerating, setTdsGenerating] = useState(false);
  const [lastTdsBatch, setLastTdsBatch] = useState(null);
  const [tdsError, setTdsError] = useState('');
  const [tdsPreviewData, setTdsPreviewData] = useState(null);

  // Treasury Challan State Form
  const [challanBsr, setChallanBsr] = useState('0210001');
  const [challanDate, setChallanDate] = useState('2026-07-07');
  const [challanSerial, setChallanSerial] = useState('00101');
  const [challanTax, setChallanTax] = useState('');
  const [challanSaving, setChallanSaving] = useState(false);

  const fetchTdsMetadata = async () => {
    setTdsLoadingMetadata(true);
    try {
      const response = await axios.get(route('compliance.tds_24q.metadata'));
      setTdsClients(response.data.clients || []);
      setTdsBatches(response.data.batches || []);
      if (response.data.clients && response.data.clients.length > 0) {
        const firstClientId = String(response.data.clients[0].id);
        setSelectedTdsClient(firstClientId);
        handlePreviewTds(firstClientId, selectedTdsFy, selectedTdsQuarter);
      } else {
        setSelectedTdsClient('');
        setTdsPreviewData(null);
      }
    } catch (err) {
      showToast('❌ Failed to fetch TDS metadata.', 'error');
    } finally {
      setTdsLoadingMetadata(false);
    }
  };

  const handlePreviewTds = async (clientId, fy, qtr) => {
    const targetClient = clientId || selectedTdsClient;
    const targetFy = fy || selectedTdsFy;
    const targetQtr = qtr || selectedTdsQuarter;
    if (!targetClient) return;
    try {
      const response = await axios.post(route('compliance.tds_24q.preview'), {
        client_id: targetClient,
        financial_year: targetFy,
        quarter: targetQtr
      });
      setTdsPreviewData(response.data);
      if (response.data.challan) {
        setChallanBsr(response.data.challan.bsr_code);
        setChallanDate(response.data.challan.deposit_date);
        setChallanSerial(response.data.challan.challan_serial_number);
        setChallanTax(String(response.data.challan.tax_amount));
      } else {
        setChallanTax(String(response.data.total_tds_deducted || ''));
      }
    } catch (err) {
      setTdsPreviewData(null);
    }
  };

  useEffect(() => {
    if (isTdsModalOpen) {
      setLastTdsBatch(null);
      setTdsError('');
      fetchTdsMetadata();
    }
  }, [isTdsModalOpen]);

  const handleSaveChallan = async () => {
    if (!selectedTdsClient) return;
    setChallanSaving(true);
    try {
      await axios.post(route('compliance.tds_24q.save_challan'), {
        client_id: selectedTdsClient,
        financial_year: selectedTdsFy,
        quarter: selectedTdsQuarter,
        bsr_code: challanBsr,
        deposit_date: challanDate,
        challan_serial_number: challanSerial,
        tax_amount: Number(challanTax) || 0.00
      });
      showToast('🎉 Treasury Challan details saved!');
      handlePreviewTds(selectedTdsClient, selectedTdsFy, selectedTdsQuarter);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save challan.';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setChallanSaving(false);
    }
  };

  const handleGenerateTds24q = async () => {
    if (!selectedTdsClient) return;
    setTdsGenerating(true);
    setTdsError('');
    try {
      const response = await axios.post(route('compliance.tds_24q.generate'), {
        client_id: selectedTdsClient,
        financial_year: selectedTdsFy,
        quarter: selectedTdsQuarter,
        challan: {
          bsr_code: challanBsr,
          deposit_date: challanDate,
          challan_serial_number: challanSerial,
          tax_amount: Number(challanTax) || 0.00
        }
      });
      if (response.data.success) {
        showToast('🎉 Form 24Q e-TDS Text Return & Excel Reconciliation generated successfully!');
        setLastTdsBatch(response.data);
        fetchTdsMetadata();
      }
    } catch (err) {
      const errorList = err.response?.data?.errors?.tds;
      const errorMsg = Array.isArray(errorList) ? errorList.join(' ') : (err.response?.data?.message || 'Form 24Q generation failed.');
      setTdsError(errorMsg);
      showToast(`❌ ${errorMsg}`, 'error');
    } finally {
      setTdsGenerating(false);
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

  const handleUpdateEmployeeValidationStatus = (employeeId, newStatus) => {
    axios.post(route('compliance.pf_ecr.update_employee_status', employeeId), { status: newStatus })
      .then(res => {
        showToast(res.data.message || '✅ Validation status updated in database.');
        setPreviewData(prev => {
          if (!prev || !prev.line_items) return prev;
          return {
            ...prev,
            line_items: prev.line_items.map(item => 
              item.employee_id === employeeId ? { ...item, validation_status: newStatus } : item
            )
          };
        });
      })
      .catch(() => {
        showToast('❌ Failed to update employee status in database.', 'error');
      });
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
    { id: 'pt', title: 'PT Challan Summary', badge: 'State-wise', color: 'success', desc: 'Aggregates Professional Tax deductions across state slabs (Maharashtra, Karnataka, Tamil Nadu) from locked payroll. Generates 2-sheet return helper report (.xlsx).', action: 'PT State-wise Challans', btnText: 'Generate PT Report (.xlsx)', isFunctional: true },
    { id: 'tds', title: 'TDS Form 24Q', badge: 'Quarterly', color: 'success', desc: 'Quarterly return of TDS on salaries u/s 200(3). Generates official e-TDS caret-delimited return (.txt) and 4-sheet Excel reconciliation helper.', action: 'TDS Form 24Q Return', btnText: 'Generate Form 24Q (.txt)', isFunctional: true },
    { id: 'form_b', title: 'Form B - Register of Wages', badge: 'Tamil Nadu LWF', color: 'success', desc: 'Establishment-level monthly wage register (Rule 29, TN Labour Welfare Fund Rules 1973) generated from a locked payroll run.', action: 'Form B Register of Wages', btnText: 'Generate Form B', isFunctional: true, isPage: true }
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
      <Link href={route('compliance.client_details', row.id)}>
        <Button variant="secondary" size="xs">View</Button>
      </Link>
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
              <h3 className="text-xl font-bold mb-1 text-white" style={{ color: '#ffffff' }}>Overall Compliance</h3>
              <p className="text-sm text-white m-0" style={{ color: '#ffffff', opacity: 0.95 }}>Standing: {stats?.completed_filings} of {stats?.total_filings} required filings completed.</p>
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
                    onClick={() => {
                      if (report.isPage) router.visit(route('compliance.form_b.index'));
                      else if (report.id === 'esi') setIsEsiModalOpen(true);
                      else if (report.id === 'pt') setIsPtModalOpen(true);
                      else if (report.id === 'tds') setIsTdsModalOpen(true);
                      else setIsEcrModalOpen(true);
                    }}
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
              <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-4 rounded-md space-y-3">
                <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  ECR Generation Blocked — Data Validation Errors Found
                </div>
                <p className="text-xs text-red-700 mb-2">The following mandatory EPFO fields are missing or invalid in your payroll/employee setup. Please correct these records before generating the official return:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-red-800 max-h-48 overflow-y-auto">
                  {previewData.errors?.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>

                {(previewData.missing_pf_est_code || previewData.errors?.some(e => e.includes('PF Establishment Code is not configured'))) && (
                  <div className="mt-3 pt-3 border-t border-red-200 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded border border-red-300 shadow-sm">
                    <div>
                      <div className="text-xs font-bold text-red-900">
                        Missing PF Establishment Code for {runs.find(r => String(r.id) === String(selectedRunId))?.client_name || previewData.client_name || 'Client'}
                      </div>
                      <div className="text-[11px] text-gray-600">Set and store the PF Establishment Code directly from here to unblock ECR generation.</div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 font-bold text-xs shrink-0"
                      onClick={() => {
                        const currentRun = runs.find(r => String(r.id) === String(selectedRunId));
                        openConfigureStatutoryCode(
                          'pf',
                          previewData.client_id || currentRun?.client_id,
                          previewData.client_name || currentRun?.client_name,
                          currentRun?.pf_establishment_code || ''
                        );
                      }}
                    >
                      ⚡ Set PF Establishment Code
                    </Button>
                  </div>
                )}
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
                    <div className="text-xs font-semibold text-indigo-700 uppercase">Employee EPF & VPF</div>
                    <div className="text-[10px] text-blue-800 font-medium mt-0.5">
                      (EPF 12%: ₹{Number(previewData.summary.total_employee_pf ?? (previewData.summary.total_employee_epf - (previewData.summary.total_vpf || 0))).toLocaleString('en-IN')} + VPF: ₹{Number(previewData.summary.total_vpf || 0).toLocaleString('en-IN')})
                    </div>
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
                            <th className="p-2">EE PF (12%)</th>
                            <th className="p-2 text-blue-700">EE VPF</th>
                            <th className="p-2">EE Remitted (Field 7)</th>
                            <th className="p-2">ER EPF</th>
                            <th className="p-2">EPS</th>
                            <th className="p-2">NCP</th>
                            <th className="p-2">Validation Status</th>
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
                              <td className="p-2">₹{Number(emp.ee_pf ?? (emp.ee_epf - (emp.vpf || 0))).toLocaleString('en-IN')}</td>
                              <td className="p-2 font-semibold text-blue-700">₹{Number(emp.vpf || 0).toLocaleString('en-IN')}</td>
                              <td className="p-2 font-semibold text-indigo-700">₹{Number(emp.ee_epf).toLocaleString('en-IN')}</td>
                              <td className="p-2 font-semibold text-purple-700">₹{Number(emp.er_epf).toLocaleString('en-IN')}</td>
                              <td className="p-2">₹{Number(emp.eps_contribution).toLocaleString('en-IN')}</td>
                              <td className="p-2">{emp.ncp_days}</td>
                              <td className="p-2">
                                <select
                                  className={`px-2 py-0.5 rounded text-xs font-semibold border cursor-pointer ${
                                    emp.validation_status === 'Valid'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-red-50 text-red-800 border-red-300'
                                  }`}
                                  value={emp.validation_status || 'Valid'}
                                  onChange={(e) => handleUpdateEmployeeValidationStatus(emp.employee_id, e.target.value)}
                                  title={emp.validation_reason || 'Click to change validation status in DB'}
                                >
                                  <option value="Valid">✓ Valid</option>
                                  <option value="Validation Error">⚠ Validation Error</option>
                                  <option value="Invalid">❌ Invalid</option>
                                </select>
                              </td>
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
                        <th className="p-2">Employee Count</th>
                        <th className="p-2">ECR Status</th>
                        <th className="p-2">TRRN</th>
                        <th className="p-2">Payment Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map(b => (
                        <tr key={b.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-mono">#ECR-{b.id}</td>
                          <td className="p-2">{b.client?.company_name || 'N/A'}</td>
                          <td className="p-2">{b.wage_month ? b.wage_month.substring(0, 7) : ''}</td>
                          <td className="p-2 font-semibold text-center">{b.employee_count || '—'}</td>
                          <td className="p-2">
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-medium">
                              {b.status === 'generated' ? 'ECR Generated' : (b.status || 'ECR Generated')}
                            </span>
                          </td>
                          <td className="p-2 font-mono">{b.trrn ? b.trrn : <span className="text-gray-400 italic">Not Synced / Pending</span>}</td>
                          <td className="p-2">
                            {b.payment_status ? (
                              <Badge variant={b.payment_status === 'completed' ? 'success' : 'warning'}>{b.payment_status}</Badge>
                            ) : (
                              <span className="text-gray-500 text-[11px] italic">Not Synced (Manual EPFO Portal)</span>
                            )}
                          </td>
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
                  onChange={(e) => {
                    setSelectedEsiRunId(e.target.value);
                    handlePreviewEsi(e.target.value);
                  }}
                  options={esiRuns.map(r => ({
                    value: String(r.id),
                    label: `${r.client_name} — Run ${r.run_code} (${r.payroll_month}) [LOCKED]`
                  }))}
                  noMargin
                />
              )}
            </div>

            {esiZeroDayEmployees.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md space-y-2">
                <h4 className="font-bold text-sm text-amber-900 m-0">
                  {esiZeroDayEmployees.length} employee(s) with 0 paid days — Reason for 0 Wages required
                </h4>
                <div className="overflow-x-auto border border-amber-200 rounded bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-amber-100 text-amber-900 font-bold border-b">
                      <tr>
                        <th className="p-2">Employee</th>
                        <th className="p-2">Days</th>
                        <th className="p-2">Wages</th>
                        <th className="p-2">ESIC Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {esiZeroDayEmployees.map(emp => (
                        <tr key={emp.employee_id} className="border-b">
                          <td className="p-2">{emp.employee_name} ({emp.employee_code})</td>
                          <td className="p-2">{emp.paid_days}</td>
                          <td className="p-2">₹{Number(emp.gross_total).toLocaleString('en-IN')}</td>
                          <td className="p-2">
                            <select
                              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white w-full"
                              value={esiReasonSelections[emp.employee_id] ?? ''}
                              onChange={(e) => handleEsiReasonChange(emp.employee_id, e.target.value)}
                            >
                              <option value="">Select reason...</option>
                              {esiReasonCodes.map(rc => (
                                <option key={rc.code} value={rc.code}>{rc.code} - {rc.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Missing ESI Code Warning & Quick-Config Drawer */}
            {(esiPreviewData?.missing_esi_code || esiError?.includes('ESI Code Number is not configured')) && (
              <div className="bg-amber-50 border border-amber-300 border-l-4 border-l-amber-500 p-3.5 rounded-md flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      ESI Code Number is not configured for {esiRuns.find(r => String(r.id) === String(selectedEsiRunId))?.client_name || esiPreviewData?.client_name || 'Client'}
                    </div>
                    <div className="text-[11px] text-amber-800">Configure the 17-digit ESIC employer code directly here to enable file generation.</div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 font-bold text-xs shrink-0"
                  onClick={() => {
                    const currentRun = esiRuns.find(r => String(r.id) === String(selectedEsiRunId));
                    openConfigureStatutoryCode(
                      'esi',
                      esiPreviewData?.client_id || currentRun?.client_id,
                      esiPreviewData?.client_name || currentRun?.client_name,
                      currentRun?.esi_code_number || ''
                    );
                  }}
                >
                  ⚡ Set ESI Code Number
                </Button>
              </div>
            )}

            {esiError && !esiError.includes('ESI Code Number is not configured') && (
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

        {/* PT Challan Modal */}
        <Modal
          isOpen={isPtModalOpen}
          onClose={() => setIsPtModalOpen(false)}
          title="Professional Tax (PT) State-Wise Filing Helper"
          size="lg"
        >
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-xs text-blue-900 leading-relaxed">
              <strong>Professional Tax (PT) Return Helper:</strong> Aggregates Professional Tax deductions across state slabs (Maharashtra, Karnataka, Tamil Nadu, etc.) from <strong>locked payroll runs</strong>. Generates a 2-sheet Excel report containing state slab summaries and an employee-level PT register.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Select Locked Payroll Run:
              </label>
              {ptLoadingRuns ? (
                <div className="text-xs text-gray-500 py-2">Loading locked payroll runs...</div>
              ) : ptRuns.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                  ⚠️ No locked payroll runs found. Please lock a payroll run first.
                </div>
              ) : (
                <select
                  value={selectedPtRunId}
                  onChange={(e) => {
                    setSelectedPtRunId(e.target.value);
                    handlePreviewPt(e.target.value);
                  }}
                  className="w-full text-xs border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:border-blue-500"
                >
                  {ptRuns.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.client_name} — Wage Month: {r.payroll_month} (Run #{r.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {ptPreviewData && ptPreviewData.states && ptPreviewData.states.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-2">
                <h4 className="font-bold text-xs text-slate-800 flex justify-between">
                  <span>State PT Summary Preview ({ptPreviewData.client_name})</span>
                  <span>Total PT: ₹{Number(ptPreviewData.total_pt_amount).toLocaleString('en-IN')}</span>
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="p-1.5">State</th>
                        <th className="p-1.5">PT Reg / TIN No</th>
                        <th className="p-1.5 text-right">Employees</th>
                        <th className="p-1.5 text-right">Total Gross</th>
                        <th className="p-1.5 text-right">Total PT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ptPreviewData.states.map((s, idx) => (
                        <tr key={idx} className="border-b bg-white">
                          <td className="p-1.5 font-bold">{s.state}</td>
                          <td className="p-1.5 font-mono text-gray-600">{s.pt_reg_no}</td>
                          <td className="p-1.5 text-right">{s.count}</td>
                          <td className="p-1.5 text-right">₹{Number(s.total_gross).toLocaleString('en-IN')}</td>
                          <td className="p-1.5 text-right font-bold text-blue-900">₹{Number(s.total_pt).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsPtModalOpen(false)}>Close</Button>
              <Button
                variant="primary"
                onClick={handleGeneratePt}
                disabled={!selectedPtRunId || ptGenerating || ptRuns.length === 0}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
              >
                {ptGenerating ? 'Generating...' : 'Generate PT Report (.xlsx)'}
              </Button>
            </div>

            {ptError && (
              <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> PT Generation Blocked:
                </div>
                <div>{ptError}</div>
              </div>
            )}

            {lastPtBatch && (
              <div className="bg-green-50 border border-green-300 p-4 rounded-md text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <h4 className="font-bold text-base text-green-900">PT State-Wise Report Generated</h4>
                <p className="text-xs text-green-800">
                  Generated file: <strong>{lastPtBatch.file_name}</strong> — {lastPtBatch.employee_count} employee(s), total PT ₹{Number(lastPtBatch.total_pt_amount).toLocaleString('en-IN')}
                </p>
                <a
                  href={lastPtBatch.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                >
                  <Download className="w-4 h-4" /> Download .XLSX Report
                </a>
              </div>
            )}

            {ptBatches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-sm text-blue-900">PT Generation History</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-2">Batch #</th>
                        <th className="p-2">Client</th>
                        <th className="p-2">Month</th>
                        <th className="p-2">Employees</th>
                        <th className="p-2">Total PT</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ptBatches.map(b => (
                        <tr key={b.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-mono">#PT-{b.id}</td>
                          <td className="p-2">{b.client_name}</td>
                          <td className="p-2">{b.wage_month}</td>
                          <td className="p-2">{b.employee_count}</td>
                          <td className="p-2 font-bold">₹{Number(b.total_pt_amount).toLocaleString('en-IN')}</td>
                          <td className="p-2"><Badge variant={b.status === 'downloaded' ? 'success' : 'info'}>{b.status}</Badge></td>
                          <td className="p-2">
                            <a
                              href={b.download_url}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                              title="Download .XLSX File"
                            >
                              <Download className="w-3.5 h-3.5" /> XLSX
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

        {/* GSTR-1 Modal */}
        <Modal
          isOpen={isGstr1ModalOpen}
          onClose={() => setIsGstr1ModalOpen(false)}
          title="GSTR-1 Monthly Return Export (GSTN Official JSON & Excel)"
          size="lg"
        >
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-xs text-blue-900 leading-relaxed">
              <strong>GSTR-1 Outward Supply Return:</strong> Extracts outward B2B agency service fee invoices and builds official Table 4A (B2B Invoices) and Table 12 (HSN/SAC 9985 Summary). Generates official <strong>GSTN JSON payload (`.json`)</strong> for direct portal upload and an <strong>Excel Offline Tool Helper (`.xlsx`)</strong>.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Select Billing Month:
              </label>
              {gstr1LoadingMonths ? (
                <div className="text-xs text-gray-500 py-2">Loading billing months...</div>
              ) : gstr1Months.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                  ⚠️ No finalized billing months with raised invoices found.
                </div>
              ) : (
                <select
                  value={selectedGstr1Month}
                  onChange={(e) => {
                    setSelectedGstr1Month(e.target.value);
                    handlePreviewGstr1(e.target.value);
                  }}
                  className="w-full text-xs border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  {gstr1Months.map(m => (
                    <option key={m} value={m}>
                      Billing Month: {m}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {gstr1PreviewData && gstr1PreviewData.invoices && gstr1PreviewData.invoices.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-3">
                <h4 className="font-bold text-xs text-slate-800 flex justify-between">
                  <span>Table 4A — B2B Outward Supplies ({gstr1PreviewData.invoice_count} Invoices)</span>
                  <span>Total Tax Liability: ₹{Number(gstr1PreviewData.total_tax_liability).toLocaleString('en-IN')}</span>
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-gray-500 font-semibold">Taxable Value</div>
                    <div className="font-bold text-blue-900">₹{Number(gstr1PreviewData.total_taxable_value).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-gray-500 font-semibold">IGST</div>
                    <div className="font-bold text-purple-700">₹{Number(gstr1PreviewData.total_igst).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-gray-500 font-semibold">CGST</div>
                    <div className="font-bold text-indigo-700">₹{Number(gstr1PreviewData.total_cgst).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-gray-500 font-semibold">SGST</div>
                    <div className="font-bold text-indigo-700">₹{Number(gstr1PreviewData.total_sgst).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200 text-slate-700 font-bold border-b sticky top-0">
                      <tr>
                        <th className="p-1.5">Invoice #</th>
                        <th className="p-1.5">Client</th>
                        <th className="p-1.5">GSTIN</th>
                        <th className="p-1.5 text-right">Taxable</th>
                        <th className="p-1.5 text-right">GST</th>
                        <th className="p-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1PreviewData.invoices.map((inv, idx) => (
                        <tr key={idx} className="border-b bg-white">
                          <td className="p-1.5 font-mono font-semibold">{inv.invoice_number}</td>
                          <td className="p-1.5">{inv.client_name}</td>
                          <td className="p-1.5 font-mono text-gray-600">{inv.customer_gstin}</td>
                          <td className="p-1.5 text-right">₹{Number(inv.taxable_value).toLocaleString('en-IN')}</td>
                          <td className="p-1.5 text-right font-bold text-blue-900">₹{Number(inv.igst + inv.cgst + inv.sgst).toLocaleString('en-IN')}</td>
                          <td className="p-1.5 text-right">₹{Number(inv.total_invoice_value).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-2.5 rounded text-xs text-gray-600">
                  Table 12 (HSN Summary): not available — no per-invoice HSN/SAC data exists in TECLA PAY.
                </div>

                {gstr1PreviewData.errors && gstr1PreviewData.errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-xs text-amber-800 space-y-1">
                    <div className="font-bold">Excluded invoices ({gstr1PreviewData.errors.length}):</div>
                    {gstr1PreviewData.errors.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 p-2.5 rounded text-[11px] text-red-700">
                  Internal reconciliation export only — not validated against the current official GSTN schema. Verify before any government upload.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsGstr1ModalOpen(false)}>Close</Button>
              <Button
                variant="primary"
                onClick={handleGenerateGstr1}
                disabled={!selectedGstr1Month || gstr1Generating || gstr1Months.length === 0}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
              >
                {gstr1Generating ? 'Generating Payload...' : 'Generate GSTR-1 (.json)'}
              </Button>
            </div>

            {gstr1Error && (
              <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> GSTR-1 Generation Blocked:
                </div>
                <div>{gstr1Error}</div>
              </div>
            )}

            {lastGstr1Batch && (
              <div className="bg-green-50 border border-green-300 p-4 rounded-md text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <h4 className="font-bold text-base text-green-900">GSTR-1 Return Payload & Helper Generated</h4>
                <p className="text-xs text-green-800">
                  Generated period: <strong>{lastGstr1Batch.return_period}</strong> — {lastGstr1Batch.invoice_count} B2B invoice(s), total tax liability ₹{Number(lastGstr1Batch.total_tax_liability).toLocaleString('en-IN')}
                </p>
                <div className="flex justify-center gap-3">
                  <a
                    href={lastGstr1Batch.json_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                  >
                    <Download className="w-4 h-4" /> Download Official .JSON Payload
                  </a>
                  <a
                    href={lastGstr1Batch.xlsx_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                  >
                    <Download className="w-4 h-4" /> Download .XLSX Helper
                  </a>
                </div>
              </div>
            )}

            {gstr1Batches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-sm text-blue-900">GSTR-1 Generation History</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-2">Batch #</th>
                        <th className="p-2">Return Period</th>
                        <th className="p-2">Invoices</th>
                        <th className="p-2">Taxable Value</th>
                        <th className="p-2">Total Tax</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1Batches.map(b => (
                        <tr key={b.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-mono">#GSTR1-{b.id}</td>
                          <td className="p-2 font-bold">{b.return_period}</td>
                          <td className="p-2">{b.invoice_count}</td>
                          <td className="p-2">₹{Number(b.total_taxable_value).toLocaleString('en-IN')}</td>
                          <td className="p-2 font-bold text-blue-900">₹{Number(b.total_tax_liability).toLocaleString('en-IN')}</td>
                          <td className="p-2"><Badge variant={b.status === 'downloaded' ? 'success' : 'info'}>{b.status}</Badge></td>
                          <td className="p-2 flex items-center gap-2">
                            <a
                              href={b.json_download_url}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                              title="Download Official .JSON Payload"
                            >
                              <Download className="w-3.5 h-3.5" /> JSON
                            </a>
                            <a
                              href={b.xlsx_download_url}
                              className="text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                              title="Download .XLSX Helper"
                            >
                              <Download className="w-3.5 h-3.5" /> XLSX
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

        {/* TDS Form 24Q Modal */}
        <Modal
          isOpen={isTdsModalOpen}
          onClose={() => setIsTdsModalOpen(false)}
          title="TDS Form 24Q Quarterly Return (e-TDS Text Return & 4-Sheet Excel)"
          size="lg"
        >
          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-xs text-amber-900 leading-relaxed space-y-1">
              <div><strong>TDS Form 24Q Salary Return u/s 200(3):</strong> Generates official caret (`^`) delimited e-TDS text return (`.txt`) for Protean RPU/FVU processing and a 4-sheet Excel reconciliation helper (`.xlsx`).</div>
              <div className="font-bold text-amber-800">⚠️ Disclaimer: FVU validation NOT RUN (Official Protean FVU.exe utility not executed in local environment).</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client / Employer:</label>
                <select
                  value={selectedTdsClient}
                  onChange={(e) => {
                    setSelectedTdsClient(e.target.value);
                    handlePreviewTds(e.target.value, selectedTdsFy, selectedTdsQuarter);
                  }}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white font-medium"
                >
                  {tdsClients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name} ({c.tan_number || 'NO TAN'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Financial Year:</label>
                <select
                  value={selectedTdsFy}
                  onChange={(e) => {
                    setSelectedTdsFy(e.target.value);
                    handlePreviewTds(selectedTdsClient, e.target.value, selectedTdsQuarter);
                  }}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white font-medium"
                >
                  <option value="2026-2027">FY 2026-2027 (AY 2027-2028)</option>
                  <option value="2025-2026">FY 2025-2026 (AY 2026-2027)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Quarter:</label>
                <select
                  value={selectedTdsQuarter}
                  onChange={(e) => {
                    setSelectedTdsQuarter(e.target.value);
                    handlePreviewTds(selectedTdsClient, selectedTdsFy, e.target.value);
                  }}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white font-medium font-bold text-blue-900"
                >
                  <option value="Q1">Q1 (Apr – Jun)</option>
                  <option value="Q2">Q2 (Jul – Sep)</option>
                  <option value="Q3">Q3 (Oct – Dec)</option>
                  <option value="Q4">Q4 (Jan – Mar + Full FY Annexure-II)</option>
                </select>
              </div>
            </div>

            {/* Treasury Challan Entry Card */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs text-slate-800">1. Treasury Challan Deposit Details</h4>
                <Button size="xs" variant="secondary" onClick={handleSaveChallan} disabled={challanSaving}>
                  {challanSaving ? 'Saving...' : 'Save Challan Info'}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">BSR Code (7 Digits):</label>
                  <input
                    type="text"
                    maxLength={7}
                    value={challanBsr}
                    onChange={e => setChallanBsr(e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1 font-mono"
                    placeholder="0210001"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Deposit Date:</label>
                  <input
                    type="date"
                    value={challanDate}
                    onChange={e => setChallanDate(e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Challan Serial No:</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={challanSerial}
                    onChange={e => setChallanSerial(e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1 font-mono"
                    placeholder="00101"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Tax Amount (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={challanTax}
                    onChange={e => setChallanTax(e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1 font-bold text-blue-900"
                    placeholder="5000.00"
                  />
                </div>
              </div>
            </div>

            {/* Dataset Preview */}
            {tdsPreviewData && (
              <div className="bg-blue-50/50 border border-blue-200 p-3 rounded space-y-2">
                <h4 className="font-bold text-xs text-blue-900 flex justify-between">
                  <span>2. Return Dataset Summary ({tdsPreviewData.quarter} - {tdsPreviewData.financial_year})</span>
                  <span>Assessment Year: {tdsPreviewData.assessment_year}</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-gray-500 font-semibold">Locked Runs</div>
                    <div className="font-bold text-slate-800">{tdsPreviewData.locked_runs_count} Run(s)</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-gray-500 font-semibold">Deductees</div>
                    <div className="font-bold text-slate-800">{tdsPreviewData.employee_count} Employee(s)</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-gray-500 font-semibold">Taxable Salary</div>
                    <div className="font-bold text-blue-900">₹{Number(tdsPreviewData.total_taxable_salary).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="text-gray-500 font-semibold">TDS Deducted</div>
                    <div className="font-bold text-emerald-700">₹{Number(tdsPreviewData.total_tds_deducted).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {tdsPreviewData.quarter === 'Q4' && (
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded text-xs text-emerald-900">
                    <strong>Annexure-II Mandatory in Q4:</strong> Full-year annual salary & tax break-up will be compiled for <strong>{tdsPreviewData.q4_annual_employee_count} employee(s)</strong> across all 12 FY months.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsTdsModalOpen(false)}>Close</Button>
              <Button
                variant="primary"
                onClick={handleGenerateTds24q}
                disabled={!selectedTdsClient || tdsGenerating}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
              >
                {tdsGenerating ? 'Generating Return...' : 'Generate Form 24Q (.txt)'}
              </Button>
            </div>

            {tdsError && (
              <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> Form 24Q Generation Blocked:
                </div>
                <div>{tdsError}</div>
              </div>
            )}

            {lastTdsBatch && (
              <div className="bg-green-50 border border-green-300 p-4 rounded-md text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <h4 className="font-bold text-base text-green-900">Form 24Q e-TDS Return & Reconciliation Report Generated</h4>
                <p className="text-xs text-green-800">
                  {lastTdsBatch.quarter} ({lastTdsBatch.financial_year}) — {lastTdsBatch.employee_count} deductee(s), total tax deposited ₹{Number(lastTdsBatch.total_tax_deposited).toLocaleString('en-IN')}
                </p>
                <div className="text-[11px] font-bold text-amber-800 bg-amber-100/60 py-1 px-3 rounded inline-block">
                  {lastTdsBatch.fvu_disclaimer}
                </div>
                <div className="flex justify-center gap-3 pt-1">
                  <a
                    href={lastTdsBatch.txt_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                  >
                    <Download className="w-4 h-4" /> Download e-TDS Return (.TXT)
                  </a>
                  <a
                    href={lastTdsBatch.xlsx_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                  >
                    <Download className="w-4 h-4" /> Download 4-Sheet Excel (.XLSX)
                  </a>
                </div>
              </div>
            )}

            {tdsBatches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-sm text-blue-900">Form 24Q Generation History</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-2">Batch #</th>
                        <th className="p-2">Client</th>
                        <th className="p-2">FY / Quarter</th>
                        <th className="p-2">Deductees</th>
                        <th className="p-2">Tax Deposited</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tdsBatches.map(b => (
                        <tr key={b.id} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-mono">#24Q-{b.id}</td>
                          <td className="p-2">{b.client_name}</td>
                          <td className="p-2 font-bold">{b.financial_year} ({b.quarter})</td>
                          <td className="p-2">{b.employee_count}</td>
                          <td className="p-2 font-bold text-blue-900">₹{Number(b.total_tax_deposited).toLocaleString('en-IN')}</td>
                          <td className="p-2"><Badge variant={b.status === 'downloaded' ? 'success' : 'info'}>{b.status}</Badge></td>
                          <td className="p-2 flex items-center gap-2">
                            <a
                              href={b.txt_download_url}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                              title="Download e-TDS Return (.TXT)"
                            >
                              <Download className="w-3.5 h-3.5" /> TXT
                            </a>
                            <a
                              href={b.xlsx_download_url}
                              className="text-emerald-700 hover:underline flex items-center gap-1 font-bold"
                              title="Download 4-Sheet Excel Reconciliation"
                            >
                              <Download className="w-3.5 h-3.5" /> XLSX
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

        {/* CLIENT AUDIT PACK MODAL */}
        <Modal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          title="Client Audit Pack (.zip)"
          size="lg"
          footer={
            <div className="flex justify-between w-full items-center">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Read-only — collects existing files only, nothing recalculated
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsAuditModalOpen(false)}>Close</Button>
                <Button
                  variant="primary"
                  className="bg-green-700 hover:bg-green-800 font-bold"
                  onClick={handleGenerateAuditPack}
                  disabled={auditGenerating || !selectedAuditClientId || !selectedAuditPeriod}
                >
                  {auditGenerating ? 'Generating...' : 'Generate Audit Pack (.zip)'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-gray-200 p-4 rounded-md flex flex-wrap gap-4">
              <div className="flex-1 min-w-[220px]">
                <Select
                  label="Client"
                  value={selectedAuditClientId}
                  onChange={(e) => setSelectedAuditClientId(e.target.value)}
                  options={(clients || []).map(c => ({ value: String(c.id), label: c.name }))}
                  noMargin
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Period</label>
                <input
                  type="month"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  value={selectedAuditPeriod}
                  onChange={(e) => setSelectedAuditPeriod(e.target.value)}
                />
              </div>
            </div>

            {auditError && (
              <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-3 rounded text-xs text-red-800">{auditError}</div>
            )}

            {lastAuditResult && (
              <div className="bg-green-50 border border-green-300 p-4 rounded-md space-y-2">
                <div className="flex items-center gap-2 font-bold text-green-900 text-sm">
                  <CheckCircle2 className="w-5 h-5" /> Audit Pack Generated
                </div>
                <div className="text-xs text-green-800">
                  {lastAuditResult.included_count} file(s) included, {lastAuditResult.missing_count} missing/unavailable.
                </div>
                {lastAuditResult.manifest?.missing_items?.length > 0 && (
                  <ul className="text-[11px] text-amber-800 list-disc pl-4 space-y-0.5">
                    {lastAuditResult.manifest.missing_items.map((m, i) => (
                      <li key={i}>{m.folder}: {m.reason}</li>
                    ))}
                  </ul>
                )}
                <a
                  href={lastAuditResult.download_url}
                  className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-4 py-2 rounded shadow"
                >
                  <Download className="w-4 h-4" /> Download .ZIP
                </a>
              </div>
            )}

            {auditBatches.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <h4 className="font-bold text-sm text-blue-900">Generation History</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-2">Client</th>
                        <th className="p-2">Period</th>
                        <th className="p-2">Included</th>
                        <th className="p-2">Missing</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditBatches.map(b => (
                        <tr key={b.id} className="border-b hover:bg-slate-50">
                          <td className="p-2">{b.client?.company_name || 'N/A'}</td>
                          <td className="p-2">{b.period}</td>
                          <td className="p-2">{b.included_count}</td>
                          <td className="p-2">{b.missing_count}</td>
                          <td className="p-2"><Badge variant={b.status === 'downloaded' ? 'success' : 'info'}>{b.status}</Badge></td>
                          <td className="p-2">
                            <a href={route('compliance.audit_pack.download', b.id)} className="text-blue-600 hover:underline flex items-center gap-1 font-bold">
                              <Download className="w-3.5 h-3.5" /> ZIP
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

        {/* QUICK STATUTORY CODE CONFIGURATION MODAL (PF & ESI) */}
        <Modal
          isOpen={isStatutoryCodeModalOpen}
          onClose={() => setIsStatutoryCodeModalOpen(false)}
          title={statutoryCodeType === 'pf' ? `Set PF Establishment Code — ${statutoryClientName}` : `Set ESI Code Number — ${statutoryClientName}`}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsStatutoryCodeModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                className="bg-blue-900 hover:bg-blue-800 font-bold"
                onClick={handleSaveStatutoryCode}
                disabled={statutoryCodeSaving}
              >
                {statutoryCodeSaving ? 'Saving...' : 'Save & Refresh Preview'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-blue-900">
              <p className="m-0 font-medium">
                Setting this code will store it permanently in client records for <strong>{statutoryClientName}</strong> and instantly re-run validation for your active preview.
              </p>
            </div>

            {statutoryCodeType === 'pf' ? (
              <div className="space-y-1">
                <Input
                  label="EPFO PF Establishment Code"
                  value={statutoryCodeValue}
                  onChange={(e) => setStatutoryCodeValue(e.target.value)}
                  placeholder="e.g. MH/BAN/1234567/000 or MHBAN1234567000"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Format: Region (2 letters) / Office (3 letters) / Establishment Code (7 digits) / Extension (3 digits).
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  label="ESIC Employer Code Number (17 digits)"
                  value={statutoryCodeValue}
                  onChange={(e) => setStatutoryCodeValue(e.target.value)}
                  placeholder="e.g. 31000123450000101"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Format: 17-digit numeric Employer Code issued by Employees' State Insurance Corporation.
                </p>
              </div>
            )}
          </div>
        </Modal>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
