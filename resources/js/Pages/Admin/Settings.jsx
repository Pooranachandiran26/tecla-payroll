import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Tabs from '../../Components/ui/Tabs';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Checkbox from '../../Components/ui/Checkbox';
import ConfirmDialog from '../../Components/ui/ConfirmDialog';
import useToast from '../../Hooks/useToast';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  const [docVerify, setDocVerify] = useState(true);

  const tabs = [
    { key: 'company', label: 'Company Profile' },
    { key: 'localization', label: 'Localization' },
    { key: 'file_upload_policy', label: 'File Upload Policy' },
    { key: 'branding', label: 'Branding' },
    { key: 'email', label: 'Email Delivery' },
    { key: 'slabs', label: 'Statutory Slab Configurations' },
    { key: 'notif', label: 'Notification Setup' },
    { key: 'onboarding', label: 'Onboarding Policy' },
    { key: 'payroll', label: 'Payroll Configuration' },
    { key: 'auth_security', label: 'Authentication & Security' }
  ];

  const [ptSlabs, setPtSlabs] = useState([]);
  const [ptSlabsLoading, setPtSlabsLoading] = useState(false);

  // Company Settings State
  const [companySettings, setCompanySettings] = useState({});
  const [companyLoading, setCompanyLoading] = useState(false);

  // Localization State
  const [localizationSettings, setLocalizationSettings] = useState({
    timezone: 'Asia/Kolkata',
    date_format: 'DD/MM/YYYY',
    currency_symbol: '₹',
    currency_code: 'INR',
    financial_year_start_month: 4
  });
  const [localizationLoading, setLocalizationLoading] = useState(false);
  const [localizationSaving, setLocalizationSaving] = useState(false);

  // File Upload Policy State
  const [uploadPolicySettings, setUploadPolicySettings] = useState({
    max_file_size_mb: 10,
    allowed_document_types: ['pdf', 'jpg', 'jpeg', 'png']
  });
  const [uploadPolicyLoading, setUploadPolicyLoading] = useState(false);
  const [uploadPolicySaving, setUploadPolicySaving] = useState(false);

  // Auth & Security State
  const [authSettings, setAuthSettings] = useState({});
  const [authLoading, setAuthLoading] = useState(false);
  
  // Payroll State
  const [payrollSettings, setPayrollSettings] = useState({});
  const [payrollLoading, setPayrollLoading] = useState(false);
  
  // Branding State
  const [brandingSettings, setBrandingSettings] = useState({});
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');
  const [brandingColor, setBrandingColor] = useState('#1e3a8a');
  const [brandingTheme, setBrandingTheme] = useState('system');
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  
  const [emailSettings, setEmailSettings] = useState({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, key: null, newValue: null, reason: '', confirmText: '' });

  // Watcher State
  const [watchers, setWatchers] = useState([]);
  const [watchersLoading, setWatchersLoading] = useState(false);
  const [showWatcherForm, setShowWatcherForm] = useState(false);
  const [currentWatcher, setCurrentWatcher] = useState({ name: '', email: '', is_active: true, categories: [], notes: '' });

  useEffect(() => {
    if (activeTab === 'company' && Object.keys(companySettings).length === 0) {
      fetchCompanySettings();
    }
    if (activeTab === 'slabs' && ptSlabs.length === 0) {
      fetchPtSlabs();
    }
    if (activeTab === 'auth_security' && Object.keys(authSettings).length === 0) {
      fetchAuthSettings();
    }
    if (activeTab === 'email' && Object.keys(emailSettings).length === 0) {
      fetchEmailSettings();
    }
    if (activeTab === 'payroll' && Object.keys(payrollSettings).length === 0) {
      fetchPayrollSettings();
    }
    if (activeTab === 'branding' && Object.keys(brandingSettings).length === 0) {
      fetchBrandingSettings();
    }
    if (activeTab === 'localization' && Object.keys(localizationSettings).length === 0 && !localizationLoading) {
      fetchLocalizationSettings();
    }
    if (activeTab === 'file_upload_policy' && !uploadPolicyLoading) {
      fetchUploadPolicySettings();
    }
    if (activeTab === 'notif' && watchers.length === 0) {
      fetchWatchers();
    }
  }, [activeTab]);

  const fetchCompanySettings = async () => {
    setCompanyLoading(true);
    try {
      const res = await axios.get(route('admin.settings.company.show'));
      setCompanySettings(res.data);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load company settings' });
    } finally {
      setCompanyLoading(false);
    }
  };

  const fetchLocalizationSettings = async () => {
    setLocalizationLoading(true);
    try {
      const res = await axios.get(route('admin.settings.localization.show'));
      setLocalizationSettings(prev => ({ ...prev, ...res.data }));
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load localization settings' });
    } finally {
      setLocalizationLoading(false);
    }
  };

  const saveLocalizationSettings = async (e) => {
    e.preventDefault();
    setLocalizationSaving(true);
    try {
      await axios.put(route('admin.settings.localization.update'), localizationSettings);
      showToast({ type: 'success', title: 'Success', message: 'Localization settings updated!' });
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.response?.data?.message || 'Failed to save settings' });
    } finally {
      setLocalizationSaving(false);
    }
  };

  const fetchUploadPolicySettings = async () => {
    setUploadPolicyLoading(true);
    try {
      const res = await axios.get(route('admin.settings.file-upload-policy.show'));
      if (res.data && Object.keys(res.data).length > 0) {
        // Parse JSON array if it comes as string
        const parsed = { ...res.data };
        if (typeof parsed.allowed_document_types === 'string') {
          try { parsed.allowed_document_types = JSON.parse(parsed.allowed_document_types); } catch(e){}
        }
        setUploadPolicySettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load file upload policy' });
    } finally {
      setUploadPolicyLoading(false);
    }
  };

  const saveUploadPolicySettings = async (e) => {
    e.preventDefault();
    setUploadPolicySaving(true);
    try {
      await axios.put(route('admin.settings.file-upload-policy.update'), uploadPolicySettings);
      showToast({ type: 'success', title: 'Success', message: 'File Upload Policy updated!' });
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.response?.data?.message || 'Failed to save settings' });
    } finally {
      setUploadPolicySaving(false);
    }
  };

  const fetchPtSlabs = async () => {
    setPtSlabsLoading(true);
    try {
      const res = await axios.get(route('admin.settings.pt-slabs'));
      setPtSlabs(res.data);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load statutory slabs' });
    } finally {
      setPtSlabsLoading(false);
    }
  };

  const handleCompanyChange = (key, value) => {
    setCompanySettings(prev => ({ ...prev, [key]: value }));
  };

  const saveCompanySettings = async (e) => {
    e.preventDefault();
    try {
      await axios.put(route('admin.settings.company.update'), companySettings);
      showToast({ type: 'success', title: 'Success', message: 'Company Profile updated successfully!' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save company settings' });
    }
  };

  const fetchPayrollSettings = async () => {
    setPayrollLoading(true);
    try {
      const res = await axios.get(route('admin.settings.payroll.show'));
      setPayrollSettings(res.data);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load payroll settings' });
    } finally {
      setPayrollLoading(false);
    }
  };

  const savePayrollSettings = async (value) => {
    try {
      await axios.put(route('admin.settings.payroll.update'), { default_lop_basis: value });
      setPayrollSettings(prev => ({ ...prev, default_lop_basis: value }));
      showToast({ type: 'success', title: 'Success', message: 'Global LOP Basis updated.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save payroll settings' });
    }
  };

  // ── Branding Functions ──────────────────────────────
  const fetchBrandingSettings = async () => {
    setBrandingLoading(true);
    try {
      const res = await axios.get(route('admin.settings.branding.show'));
      setBrandingSettings(res.data);
      setBrandingColor(res.data.primary_color || '#1e3a8a');
      setBrandingTheme(res.data.theme_mode_default || 'system');
      if (res.data.logo_path_url) setLogoPreview(res.data.logo_path_url);
      if (res.data.favicon_path_url) setFaviconPreview(res.data.favicon_path_url);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load branding settings' });
    } finally {
      setBrandingLoading(false);
    }
  };

  const handleFileSelect = (type, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast({ type: 'error', title: 'Error', message: `${type === 'logo' ? 'Logo' : 'Favicon'} must be less than 2MB` });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(e.target.result);
      } else {
        setFaviconFile(file);
        setFaviconPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveBrandingSettings = async () => {
    setBrandingSaving(true);
    try {
      const formData = new FormData();
      if (logoFile) formData.append('logo', logoFile);
      if (faviconFile) formData.append('favicon', faviconFile);
      formData.append('primary_color', brandingColor);
      formData.append('theme_mode_default', brandingTheme);

      await axios.post(route('admin.settings.branding.update'), formData);

      // Re-fetch to get updated URLs
      await fetchBrandingSettings();
      setLogoFile(null);
      setFaviconFile(null);
      showToast({ type: 'success', title: 'Success', message: 'Branding settings saved successfully!' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save branding settings' });
    } finally {
      setBrandingSaving(false);
    }
  };

  const fetchAuthSettings = async () => {
    setAuthLoading(true);
    try {
      const res = await axios.get(route('admin.settings.auth-security.show'));
      if (typeof res.data === 'string') {
        throw new Error('API returned HTML instead of JSON. You might not be logged in as an Admin.');
      }
      setAuthSettings(res.data);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message || 'Failed to load auth settings' });
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchWatchers = async () => {
    setWatchersLoading(true);
    try {
      const res = await axios.get(route('watchers.index'));
      setWatchers(res.data);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load watchers' });
    } finally {
      setWatchersLoading(false);
    }
  };

  const saveWatcher = async (e) => {
    e.preventDefault();
    try {
      if (currentWatcher.id) {
        await axios.put(route('watchers.update', currentWatcher.id), currentWatcher);
        showToast({ type: 'success', title: 'Success', message: 'Watcher updated.' });
      } else {
        await axios.post(route('watchers.store'), currentWatcher);
        showToast({ type: 'success', title: 'Success', message: 'Watcher added.' });
      }
      setShowWatcherForm(false);
      fetchWatchers();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save watcher' });
    }
  };

  const deleteWatcher = async (id) => {
    if(!confirm('Are you sure you want to delete this watcher?')) return;
    try {
      await axios.delete(route('watchers.destroy', id));
      showToast({ type: 'success', title: 'Success', message: 'Watcher deleted.' });
      fetchWatchers();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to delete watcher' });
    }
  };

  
  const fetchEmailSettings = async () => {
    setEmailLoading(true);
    try {
      const res = await axios.get(route('admin.settings.email.show'));
      setEmailSettings(res.data);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load email settings' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailChange = (key, value) => {
    setEmailSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveEmailSettings = async () => {
    setConfirmModal({
      isOpen: true,
      type: 'email',
      key: 'email',
      newValue: emailSettings,
      reason: 'email_restart',
      confirmText: ''
    });
  };

  const confirmEmailUpdate = async () => {
    try {
      await axios.put(route('admin.settings.email.update'), emailSettings);
      showToast({ type: 'success', title: 'Success', message: 'Email settings saved successfully. Workers are restarting.' });
      setConfirmModal({ isOpen: false, key: null, newValue: null, reason: '', confirmText: '', type: null });
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.response?.data?.message || 'Failed to update email settings' });
    }
  };

  const testEmailConnection = async () => {
    setTestingEmail(true);
    try {
      await axios.post(route('admin.settings.email.test'), emailSettings);
      showToast({ type: 'success', title: 'Success', message: 'Test email sent successfully!' });
    } catch (e) {
      const errorReason = e.response?.data?.error;
      const details = e.response?.data?.details || e.message;
      let msg = 'Failed to send test email.';
      if (errorReason === 'host_unreachable') msg = 'Could not reach the SMTP server. Check Host and Port.';
      if (errorReason === 'auth_failed') msg = 'SMTP Authentication failed. Check Username and Password.';
      if (errorReason === 'timeout') msg = 'Connection timed out.';
      if (errorReason === 'invalid_from') msg = 'Sender address was rejected by the server.';
      showToast({ type: 'error', title: 'Test Failed', message: msg + ' (' + details + ')' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleAuthChange = (key, newValue) => {
    const setting = authSettings[key];
    if (setting.is_locked) {
      if (key === 'audit_logging_enabled' || key === 'mask_sensitive_data_in_logs') {
        showToast({ type: 'error', title: 'Locked', message: 'This setting is permanently locked for compliance.' });
        return;
      }
      setConfirmModal({ isOpen: true, key, newValue, reason: '', confirmText: '' });
    } else {
      updateAuthSetting(key, newValue);
    }
  };

  const updateAuthSetting = async (key, newValue, confirmData = null) => {
    const payload = {
      settings: [
        {
          key,
          value: newValue,
          ...(confirmData || {})
        }
      ]
    };

    try {
      await axios.put(route('admin.settings.auth-security.update'), payload);
      setAuthSettings(prev => ({
        ...prev,
        [key]: { ...prev[key], value: newValue }
      }));
      showToast({ type: 'success', title: 'Success', message: 'Authentication settings updated successfully.' });
      setConfirmModal({ isOpen: false, key: null, newValue: null, reason: '', confirmText: '' });
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.response?.data?.error || 'Failed to update setting' });
    }
  };

  const confirmLockedUpdate = () => {
    if (confirmModal.type === 'email') {
      if (confirmModal.confirmText !== 'CONFIRM') {
        showToast({ type: 'error', title: 'Error', message: 'Please type CONFIRM exactly.' });
        return;
      }
      confirmEmailUpdate();
      return;
    }
    if (confirmModal.confirmText !== 'CONFIRM') {
      showToast({ type: 'error', title: 'Error', message: 'Please type CONFIRM exactly.' });
      return;
    }
    if (confirmModal.reason.length < 10) {
      showToast({ type: 'error', title: 'Error', message: 'Reason must be at least 10 characters.' });
      return;
    }
    updateAuthSetting(confirmModal.key, confirmModal.newValue, {
      confirm_text: confirmModal.confirmText,
      reason: confirmModal.reason
    });
  };

  const renderAuthVal = (key, fallback = '') => authSettings[key]?.value ?? fallback;

  return (
    <RoleGuard allowedRoles={['admin']}>
    <AuthenticatedLayout>
      <Head title="System Settings" />
      
      <div className="mb-6">
        <h2 className="mt-2 text-2xl font-bold">System Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Configure default agency rules, customize professional tax (PT) slabs, and manage notification targets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 items-start">
        {/* Left Sidebar Menu */}
        <Card noPadding className="sticky top-6">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Settings Menu</h3>
          </div>
          <ul className="flex flex-col py-2">
            {tabs.map(tab => (
              <li key={tab.key}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    activeTab === tab.key 
                      ? 'bg-blue-50/50 text-blue-700 border-l-4 border-blue-600 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.icon && <tab.icon size={16} />}
                    {tab.label}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Right Content Area */}
        <Card noPadding>
          <div className="p-6">
          {activeTab === 'company' && (
            <div className="max-w-4xl">
              {companyLoading ? (
                <div>Loading Company Settings...</div>
              ) : (
                <form onSubmit={saveCompanySettings}>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <Input label="Agency Legal Name" value={companySettings.agency_legal_name || ''} onChange={e => handleCompanyChange('agency_legal_name', e.target.value)} noMargin />
                    </div>
                    <div className="flex-1">
                      <Input label="TAN Number (Tax Deduction Account)" value={companySettings.tan_number || ''} onChange={e => handleCompanyChange('tan_number', e.target.value)} noMargin />
                    </div>
                  </div>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <Input label="Default Authorized Signatory" value={companySettings.default_authorized_signatory || ''} onChange={e => handleCompanyChange('default_authorized_signatory', e.target.value)} noMargin />
                    </div>
                    <div className="flex-1">
                      <Input label="Register Office Address" value={companySettings.registered_office_address || ''} onChange={e => handleCompanyChange('registered_office_address', e.target.value)} noMargin />
                    </div>
                  </div>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <Input label="Agency GSTIN" value={companySettings.agency_gstin || ''} onChange={e => handleCompanyChange('agency_gstin', e.target.value)} noMargin />
                    </div>
                    <div className="flex-1">
                      {/* Placeholder for future expansion */}
                    </div>
                  </div>
                  <Button type="submit" variant="primary" className="mt-4">Update Basic Profile</Button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="max-w-4xl">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Localization Settings</h3>
              <p className="text-sm text-gray-500 mb-6">Manage timezone, currency symbols, and date formats used across the platform.</p>
              
              {localizationLoading ? (
                <div>Loading Localization Settings...</div>
              ) : (
                <form onSubmit={saveLocalizationSettings} className="space-y-6">
                  <Card title="Regional Defaults" noPadding>
                    <div className="grid grid-cols-2 gap-6 p-4">
                      <Select 
                        label="Timezone" 
                        value={localizationSettings.timezone || 'Asia/Kolkata'}
                        onChange={e => setLocalizationSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        options={[
                          { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                          { value: 'UTC', label: 'UTC' },
                          { value: 'America/New_York', label: 'America/New_York (EST)' },
                          { value: 'Europe/London', label: 'Europe/London (GMT)' },
                        ]}
                      />
                      <Select 
                        label="Date Format" 
                        value={localizationSettings.date_format || 'DD/MM/YYYY'}
                        onChange={e => setLocalizationSettings(prev => ({ ...prev, date_format: e.target.value }))}
                        options={[
                          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 25/12/2026)' },
                          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 12/25/2026)' },
                          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-12-25)' },
                        ]}
                      />
                    </div>
                  </Card>
                  
                  <Card title="Financial Settings" noPadding>
                    <div className="grid grid-cols-2 gap-6 p-4">
                      <Input 
                        label="Currency Symbol" 
                        value={localizationSettings.currency_symbol || '₹'}
                        onChange={e => setLocalizationSettings(prev => ({ ...prev, currency_symbol: e.target.value }))}
                        placeholder="e.g. ₹ or $"
                      />
                      <Input 
                        label="Currency Code" 
                        value={localizationSettings.currency_code || 'INR'}
                        onChange={e => setLocalizationSettings(prev => ({ ...prev, currency_code: e.target.value }))}
                        placeholder="e.g. INR or USD"
                      />
                      <Select 
                        label="Financial Year Start Month" 
                        value={localizationSettings.financial_year_start_month || 4}
                        onChange={e => setLocalizationSettings(prev => ({ ...prev, financial_year_start_month: parseInt(e.target.value) }))}
                        options={[
                          { value: 1, label: 'January' },
                          { value: 4, label: 'April' },
                          { value: 7, label: 'July' },
                          { value: 10, label: 'October' },
                        ]}
                      />
                    </div>
                  </Card>
                  
                  <Button type="submit" variant="primary" disabled={localizationSaving}>
                    {localizationSaving ? 'Saving...' : 'Save Localization'}
                  </Button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'file_upload_policy' && (
            <div className="max-w-4xl">
              <h3 className="text-lg font-bold text-gray-800 mb-1">File Upload Policy</h3>
              <p className="text-sm text-gray-500 mb-6">Configure global defaults for document uploads across the platform.</p>
              
              {uploadPolicyLoading ? (
                <div>Loading Upload Policy...</div>
              ) : (
                <form onSubmit={saveUploadPolicySettings} className="space-y-6">
                  <Card title="Upload Constraints" noPadding>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                      <div>
                        <Input 
                          type="number"
                          label="Max File Size (MB)" 
                          value={uploadPolicySettings.max_file_size_mb || 10}
                          onChange={e => setUploadPolicySettings(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) || 10 }))}
                          min={1}
                          max={100}
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum allowed size per file. Hard limit is 100MB.</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Document Types</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'csv'].map(type => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={(uploadPolicySettings.allowed_document_types || []).includes(type)}
                                onChange={(e) => {
                                  setUploadPolicySettings(prev => {
                                    const types = prev.allowed_document_types || [];
                                    if (e.target.checked) {
                                      return { ...prev, allowed_document_types: [...types, type] };
                                    } else {
                                      return { ...prev, allowed_document_types: types.filter(t => t !== type) };
                                    }
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-700 uppercase">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Button type="submit" variant="primary" disabled={uploadPolicySaving}>
                    {uploadPolicySaving ? 'Saving...' : 'Save Upload Policy'}
                  </Button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'slabs' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800">Professional Tax (PT) Slabs</h3>
              <p className="text-sm text-gray-500 mb-4">PT rates dynamically map to employee work states for accurate monthly deduction.</p>
              
              {ptSlabsLoading ? (
                <div>Loading Slabs...</div>
              ) : (
                <DataTable 
                  columns={[
                    { label: 'From (Gross)', key: 'from' },
                    { label: 'To (Gross)', key: 'to' },
                    { label: 'Deduction', key: 'deduction' },
                    { label: 'Exceptions/Notes', key: 'exceptions' },
                    { 
                      label: 'Action', 
                      key: 'id',
                      render: (_, row) => (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          disabled={row.disabled}
                          onClick={() => showToast({ type: 'error', title: 'Action Locked', message: 'PT bracket editing is locked for compliance safety.' })}
                        >
                          Modify
                        </Button>
                      )
                    }
                  ]}
                  data={ptSlabs}
                />
              )}
            </div>
          )}

          {activeTab === 'notif' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base text-blue-900 font-bold">Global Notification Watchers</h3>
                {!showWatcherForm && (
                  <Button variant="primary" onClick={() => { setCurrentWatcher({ name: '', email: '', is_active: true, categories: [], notes: '' }); setShowWatcherForm(true); }}>
                    Add Watcher
                  </Button>
                )}
              </div>
              
              {showWatcherForm ? (
                <Card>
                  <form onSubmit={saveWatcher} className="flex flex-col gap-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input label="Name" value={currentWatcher.name} onChange={e => setCurrentWatcher({...currentWatcher, name: e.target.value})} required />
                      </div>
                      <div className="flex-1">
                        <Input type="email" label="Email" value={currentWatcher.email} onChange={e => setCurrentWatcher({...currentWatcher, email: e.target.value})} required />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notification Categories</label>
                      <div className="flex flex-col gap-2 p-4 border rounded bg-slate-50">
                        <Checkbox 
                          label="All modules (including future ones)" 
                          checked={currentWatcher.categories.includes('all')}
                          onChange={e => {
                            if (e.target.checked) {
                              setCurrentWatcher({...currentWatcher, categories: ['all']});
                            } else {
                              setCurrentWatcher({...currentWatcher, categories: []});
                            }
                          }}
                        />
                        <div className="ml-6 flex gap-4 mt-2">
                          <Checkbox 
                            label="Client Module" 
                            disabled={currentWatcher.categories.includes('all')}
                            checked={currentWatcher.categories.includes('client')}
                            onChange={e => {
                              const cats = new Set(currentWatcher.categories);
                              e.target.checked ? cats.add('client') : cats.delete('client');
                              setCurrentWatcher({...currentWatcher, categories: Array.from(cats)});
                            }}
                          />
                          <Checkbox 
                            label="Employee Module" 
                            disabled={currentWatcher.categories.includes('all')}
                            checked={currentWatcher.categories.includes('employee')}
                            onChange={e => {
                              const cats = new Set(currentWatcher.categories);
                              e.target.checked ? cats.add('employee') : cats.delete('employee');
                              setCurrentWatcher({...currentWatcher, categories: Array.from(cats)});
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <Input label="Notes" value={currentWatcher.notes || ''} onChange={e => setCurrentWatcher({...currentWatcher, notes: e.target.value})} />
                    
                    <Checkbox label="Active" checked={currentWatcher.is_active} onChange={e => setCurrentWatcher({...currentWatcher, is_active: e.target.checked})} />
                    
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setShowWatcherForm(false)}>Cancel</Button>
                      <Button type="submit" variant="primary">Save Watcher</Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <DataTable 
                    columns={[
                      { key: 'name', label: 'Name' },
                      { key: 'email', label: 'Email' },
                      { key: 'categories', label: 'Categories', render: (_, row) => row.categories.join(', ') },
                      { key: 'is_active', label: 'Status', render: (_, row) => row.is_active ? 'Active' : 'Inactive' },
                      { key: 'actions', label: 'Actions', render: (_, row) => (
                        <div className="flex gap-2">
                          <Button variant="secondary" size="xs" onClick={() => { setCurrentWatcher(row); setShowWatcherForm(true); }}>Edit</Button>
                          <Button variant="danger" size="xs" onClick={() => deleteWatcher(row.id)}>Delete</Button>
                        </div>
                      )}
                    ]}
                    data={watchers}
                    keyField="id"
                  />
                  {watchers.length === 0 && !watchersLoading && (
                    <div className="p-4 text-center text-gray-500">No watchers configured.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'branding' && (
            <div>
              <h3 className="text-base text-blue-900 font-bold mb-2">Branding & Appearance</h3>
              <p className="text-sm text-gray-500 mb-6">Customize logos, colors, and theme defaults for the agency portal.</p>
              
              {brandingLoading ? (
                <div>Loading branding settings...</div>
              ) : (
                <div className="space-y-8">
                  {/* Logo & Favicon Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Logo Upload */}
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-3">Agency Logo</h4>
                      <p className="text-xs text-gray-500 mb-4">Displayed in the header and login page. Max 2MB. Accepted: JPG, PNG, SVG, WebP.</p>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => logoInputRef.current?.click()}
                        style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {logoPreview ? (
                          <div>
                            <img src={logoPreview} alt="Logo preview" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                            <p className="text-xs text-gray-500">{logoFile ? logoFile.name : 'Current logo'}</p>
                            <p className="text-xs text-blue-600 mt-1">Click to replace</p>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                            <p className="text-sm font-medium text-gray-600">Click to upload logo</p>
                            <p className="text-xs text-gray-400">JPG, PNG, SVG, WebP — max 2MB</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/svg+xml,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect('logo', e.target.files[0])}
                      />
                    </Card>

                    {/* Favicon Upload */}
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-3">Favicon</h4>
                      <p className="text-xs text-gray-500 mb-4">Displayed in the browser tab. Max 2MB. Accepted: JPG, PNG, SVG, WebP.</p>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => faviconInputRef.current?.click()}
                        style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {faviconPreview ? (
                          <div>
                            <img src={faviconPreview} alt="Favicon preview" style={{ maxHeight: '64px', maxWidth: '64px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                            <p className="text-xs text-gray-500">{faviconFile ? faviconFile.name : 'Current favicon'}</p>
                            <p className="text-xs text-blue-600 mt-1">Click to replace</p>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⭐</div>
                            <p className="text-sm font-medium text-gray-600">Click to upload favicon</p>
                            <p className="text-xs text-gray-400">JPG, PNG, SVG, WebP — max 2MB</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/svg+xml,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect('favicon', e.target.files[0])}
                      />
                    </Card>
                  </div>

                  {/* Color & Theme Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Color */}
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-3">Primary Brand Color</h4>
                      <p className="text-xs text-gray-500 mb-4">Used for header backgrounds, buttons, and accents throughout the app.</p>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={brandingColor}
                          onChange={(e) => setBrandingColor(e.target.value)}
                          style={{ width: '48px', height: '48px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
                        />
                        <div>
                          <input 
                            type="text" 
                            value={brandingColor}
                            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBrandingColor(e.target.value); }}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono"
                            style={{ width: '120px' }}
                            placeholder="#1e3a8a"
                          />
                          <p className="text-xs text-gray-400 mt-1">Hex color code</p>
                        </div>
                        <div style={{ width: '80px', height: '36px', backgroundColor: brandingColor, borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                      </div>
                    </Card>

                    {/* Theme Mode */}
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-3">Default Theme Mode</h4>
                      <p className="text-xs text-gray-500 mb-4">Default appearance across the agency portal.</p>
                      <div className="flex gap-2">
                        {[
                          { value: 'light', label: '☀️ Light', desc: 'Always light' },
                          { value: 'dark', label: '🌙 Dark', desc: 'Always dark' },
                          { value: 'system', label: '💻 System', desc: 'Match OS' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setBrandingTheme(opt.value)}
                            className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                              brandingTheme === opt.value 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="text-lg">{opt.label.split(' ')[0]}</div>
                            <div className="text-xs font-semibold mt-1">{opt.label.split(' ').slice(1).join(' ')}</div>
                            <div className="text-xs text-gray-400">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button onClick={saveBrandingSettings} disabled={brandingSaving}>
                      {brandingSaving ? 'Saving...' : '💾 Save Branding Settings'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'onboarding' && (
            <div>
              <h3 className="text-base text-blue-900 font-bold mb-2">Onboarding & KYC Verification Policy</h3>
              <p className="text-sm text-gray-500 mb-6">Configure organizational constraints for transitioning employees from Onboarding to Active status.</p>
              
              <div className="flex items-center justify-between max-w-2xl border border-gray-200 p-5 rounded-md bg-slate-50">
                <div>
                  <div className="font-semibold text-blue-900">Require full document verification before Active status</div>
                  <div className="text-xs text-gray-500 mt-1">When enabled, employees remain in Onboarding until all mandatory KYC documents are marked as Verified.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={docVerify} onChange={e => { setDocVerify(e.target.checked); showToast('Onboarding policy updated successfully.'); }} noMargin />
                  <span className="font-semibold text-blue-900 min-w-[25px]">{docVerify ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div>
              <h3 className="text-base text-blue-900 font-bold mb-2">Global Payroll Defaults</h3>
              <p className="text-sm text-gray-500 mb-6">Configure default calculation behaviors for the agency. These can be overridden per client.</p>
              
              <div className="max-w-md">
                {payrollLoading ? (
                  <div>Loading...</div>
                ) : (
                  <Select 
                    label="Default LOP Calculation Basis"
                    options={[
                      { value: '26', label: '26 Working Days (excludes Sundays)' },
                      { value: '30', label: '30 Calendar Days' }
                    ]}
                    value={payrollSettings.default_lop_basis || '30'}
                    onChange={(e) => savePayrollSettings(e.target.value)}
                  />
                )}
                <div className="text-xs text-gray-500 mt-1">Used when deducting Loss of Pay (LOP) for unapproved absences.</div>
              </div>
            </div>
          )}

          
          {activeTab === 'email' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-xs text-blue-900 mb-6">
                <strong>Important:</strong> Saving these settings will automatically restart the background queue workers to apply the new configurations.
              </div>
              
              {emailLoading ? (
                <div>Loading Email Settings...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">General Configuration</h3>
                    <div className="flex flex-col gap-4">
                      <Checkbox 
                        label="Sandbox Mode (Do not send real emails)" 
                        checked={emailSettings.sandbox_mode === true || emailSettings.sandbox_mode === 'true' || emailSettings.sandbox_mode === 1} 
                        onChange={e => handleEmailChange('sandbox_mode', e.target.checked)} 
                      />
                      <Select 
                        label="OTP Send Mode"
                        options={[{value: 'sync', label: 'Synchronous (Wait for send)'}, {value: 'queued', label: 'Queued (Background)'}]}
                        value={emailSettings.otp_send_mode || 'sync'}
                        onChange={e => handleEmailChange('otp_send_mode', e.target.value)}
                      />
                      <Select 
                        label="Invitation Send Mode"
                        options={[{value: 'sync', label: 'Synchronous'}, {value: 'queued', label: 'Queued'}]}
                        value={emailSettings.invitation_send_mode || 'queued'}
                        onChange={e => handleEmailChange('invitation_send_mode', e.target.value)}
                      />
                    </div>
                  </Card>

                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">SMTP Credentials</h3>
                    <div className="flex flex-col gap-4">
                      <Input 
                        label="SMTP Host" 
                        value={emailSettings.smtp_host || ''} 
                        onChange={e => handleEmailChange('smtp_host', e.target.value)} 
                        disabled={emailSettings.sandbox_mode === true || emailSettings.sandbox_mode === 'true' || emailSettings.sandbox_mode === 1}
                      />
                      <Input 
                        type="number"
                        label="SMTP Port" 
                        value={emailSettings.smtp_port || ''} 
                        onChange={e => handleEmailChange('smtp_port', e.target.value)} 
                        disabled={emailSettings.sandbox_mode === true || emailSettings.sandbox_mode === 'true' || emailSettings.sandbox_mode === 1}
                      />
                      <Select 
                        label="Encryption"
                        options={[{value: 'tls', label: 'TLS'}, {value: 'ssl', label: 'SSL'}, {value: 'none', label: 'None'}]}
                        value={emailSettings.smtp_encryption || 'tls'}
                        onChange={e => handleEmailChange('smtp_encryption', e.target.value)}
                        disabled={emailSettings.sandbox_mode === true || emailSettings.sandbox_mode === 'true' || emailSettings.sandbox_mode === 1}
                      />
                      <Input 
                        label="SMTP Username" 
                        value={emailSettings.smtp_username || ''} 
                        onChange={e => handleEmailChange('smtp_username', e.target.value)} 
                        disabled={emailSettings.sandbox_mode === true || emailSettings.sandbox_mode === 'true' || emailSettings.sandbox_mode === 1}
                      />
                      <Input 
                        type="password"
                        label={"SMTP Password " + (emailSettings.has_password ? "(Leave blank to keep existing)" : "")} 
                        value={emailSettings.smtp_password || ''} 
                        onChange={e => handleEmailChange('smtp_password', e.target.value)} 
                        disabled={emailSettings.sandbox_mode === true || emailSettings.sandbox_mode === 'true' || emailSettings.sandbox_mode === 1}
                        placeholder={emailSettings.has_password ? '********' : ''}
                      />
                      <Input 
                        label="From Address" 
                        value={emailSettings.from_address || ''} 
                        onChange={e => handleEmailChange('from_address', e.target.value)} 
                      />
                      <Input 
                        label="From Name" 
                        value={emailSettings.from_name || ''} 
                        onChange={e => handleEmailChange('from_name', e.target.value)} 
                      />
                      
                      <div className="flex gap-4 mt-4">
                        <Button variant="secondary" onClick={testEmailConnection} disabled={testingEmail || emailSettings.sandbox_mode === true || emailSettings.sandbox_mode === 'true' || emailSettings.sandbox_mode === 1}>
                          {testingEmail ? 'Testing...' : 'Test Connection'}
                        </Button>
                        <Button variant="primary" onClick={saveEmailSettings}>Save Settings</Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'auth_security' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-xs text-blue-900 mb-6">
                <strong>Compliance Note:</strong> Changes to locked authentication settings are permanently recorded in the Activity Log.
              </div>

              {authLoading ? (
                <div>Loading Auth Settings...</div>
              ) : Object.keys(authSettings).length === 0 ? (
                <div className="text-red-500 font-semibold p-4 border border-red-200 bg-red-50 rounded">Failed to load settings data. Ensure you are logged in as an Admin.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. OTP & Login */}
                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">1. OTP & Login</h3>
                    <div className="flex flex-col gap-4">
                      <Checkbox 
                        label="Enable OTP Login" 
                        checked={renderAuthVal('otp_enabled', true) === true || renderAuthVal('otp_enabled', true) === 'true'} 
                        onChange={e => handleAuthChange('otp_enabled', e.target.checked)} 
                      />
                      <Checkbox 
                        label="Enable 'Remember Me' (5-year persistent login)" 
                        checked={renderAuthVal('remember_me_enabled', true) === true || renderAuthVal('remember_me_enabled', true) === 'true'} 
                        onChange={e => handleAuthChange('remember_me_enabled', e.target.checked)} 
                      />
                      <Checkbox 
                        label="Enable Honeypot Anti-Bot Protection" 
                        checked={renderAuthVal('honeypot_enabled', true) === true || renderAuthVal('honeypot_enabled', true) === 'true'} 
                        onChange={e => handleAuthChange('honeypot_enabled', e.target.checked)} 
                      />
                      <Input 
                        type="number" 
                        label="OTP Length (4-8)" 
                        value={renderAuthVal('otp_length')} 
                        onChange={e => handleAuthChange('otp_length', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="OTP Expiry (Minutes)" 
                        value={renderAuthVal('otp_expiry_minutes')} 
                        onChange={e => handleAuthChange('otp_expiry_minutes', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Max OTP Attempts" 
                        value={renderAuthVal('otp_max_attempts')} 
                        onChange={e => handleAuthChange('otp_max_attempts', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="OTP Resend Cooldown (Seconds)" 
                        value={renderAuthVal('otp_resend_cooldown_seconds')} 
                        onChange={e => handleAuthChange('otp_resend_cooldown_seconds', e.target.value)} 
                      />
                    </div>
                  </Card>

                  {/* 2. Lockout & Abuse Protection */}
                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">2. Lockout & Abuse Protection</h3>
                    <div className="flex flex-col gap-4">
                      <Input 
                        type="number" 
                        label="Max Failed Login Attempts" 
                        value={renderAuthVal('max_failed_login_attempts')} 
                        onChange={e => handleAuthChange('max_failed_login_attempts', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Account Lockout Duration (Minutes)" 
                        value={renderAuthVal('account_lockout_minutes')} 
                        onChange={e => handleAuthChange('account_lockout_minutes', e.target.value)} 
                      />
                      <Checkbox 
                        label="Enable Progressive Delay" 
                        checked={renderAuthVal('progressive_delay_enabled', true) === true || renderAuthVal('progressive_delay_enabled', true) === 'true'} 
                        onChange={e => handleAuthChange('progressive_delay_enabled', e.target.checked)} 
                      />
                      <Input 
                        type="number" 
                        label="IP Throttle Failed Attempts Threshold" 
                        value={renderAuthVal('ip_failed_attempts_threshold')} 
                        onChange={e => handleAuthChange('ip_failed_attempts_threshold', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="IP Throttle Window (Minutes)" 
                        value={renderAuthVal('ip_throttle_window_minutes')} 
                        onChange={e => handleAuthChange('ip_throttle_window_minutes', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="IP Throttle Duration (Minutes)" 
                        value={renderAuthVal('ip_throttle_duration_minutes')} 
                        onChange={e => handleAuthChange('ip_throttle_duration_minutes', e.target.value)} 
                      />
                    </div>
                  </Card>

                  {/* 3. Password Policy */}
                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">3. Password Policy</h3>
                    <div className="flex flex-col gap-4">
                      <Input 
                        type="number" 
                        label="Minimum Password Length (floor: 8)" 
                        value={renderAuthVal('password_min_length')} 
                        onChange={e => handleAuthChange('password_min_length', e.target.value)} 
                      />
                      <Checkbox 
                        label="Require Mixed Case" 
                        checked={renderAuthVal('require_mixed_case', true) === true || renderAuthVal('require_mixed_case', true) === 'true'} 
                        onChange={e => handleAuthChange('require_mixed_case', e.target.checked)} 
                      />
                      <Checkbox 
                        label="Require Numbers" 
                        checked={renderAuthVal('require_numbers', true) === true || renderAuthVal('require_numbers', true) === 'true'} 
                        onChange={e => handleAuthChange('require_numbers', e.target.checked)} 
                      />
                      <Checkbox 
                        label="Require Symbols" 
                        checked={renderAuthVal('require_symbols', true) === true || renderAuthVal('require_symbols', true) === 'true'} 
                        onChange={e => handleAuthChange('require_symbols', e.target.checked)} 
                      />
                      <Checkbox 
                        label="Check 'Have I Been Pwned' DB" 
                        checked={renderAuthVal('check_have_i_been_pwned', true) === true || renderAuthVal('check_have_i_been_pwned', true) === 'true'} 
                        onChange={e => handleAuthChange('check_have_i_been_pwned', e.target.checked)} 
                      />
                      <Input 
                        type="number" 
                        label="Password History Count (prevent reuse)" 
                        value={renderAuthVal('password_history_count')} 
                        onChange={e => handleAuthChange('password_history_count', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Password Expiry Days (0 = never)" 
                        value={renderAuthVal('password_expiry_days')} 
                        onChange={e => handleAuthChange('password_expiry_days', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Expiry Warning Days" 
                        value={renderAuthVal('password_expiry_warning_days')} 
                        onChange={e => handleAuthChange('password_expiry_warning_days', e.target.value)} 
                      />
                    </div>
                  </Card>

                  {/* 4. Session Management */}
                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">4. Session Management</h3>
                    <div className="flex flex-col gap-4">
                      <Input 
                        type="number" 
                        label="Max Session Lifetime (Minutes)" 
                        value={renderAuthVal('session_lifetime_minutes')} 
                        onChange={e => handleAuthChange('session_lifetime_minutes', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Idle Timeout: Admin/Manager (Minutes)" 
                        value={renderAuthVal('idle_timeout_admin_manager_minutes')} 
                        onChange={e => handleAuthChange('idle_timeout_admin_manager_minutes', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Idle Timeout: Client/Employee (Minutes)" 
                        value={renderAuthVal('idle_timeout_client_employee_minutes')} 
                        onChange={e => handleAuthChange('idle_timeout_client_employee_minutes', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Idle Warning Before (Minutes)" 
                        value={renderAuthVal('idle_warning_before_minutes')} 
                        onChange={e => handleAuthChange('idle_warning_before_minutes', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Max Concurrent Sessions (0 = unlimited)" 
                        value={renderAuthVal('max_concurrent_sessions_per_user')} 
                        onChange={e => handleAuthChange('max_concurrent_sessions_per_user', e.target.value)} 
                      />
                      <Checkbox 
                        label="Enable Login Anomaly Alerts" 
                        checked={renderAuthVal('login_anomaly_alerts_enabled', true) === true || renderAuthVal('login_anomaly_alerts_enabled', true) === 'true'} 
                        onChange={e => handleAuthChange('login_anomaly_alerts_enabled', e.target.checked)} 
                      />
                    </div>
                  </Card>

                  {/* 5. Invitation & Onboarding Security */}
                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">5. Invitation & Onboarding Security</h3>
                    <div className="flex flex-col gap-4">
                      <Input 
                        type="number" 
                        label="Invitation Expiry (Hours)" 
                        value={renderAuthVal('invitation_expiry_hours')} 
                        onChange={e => handleAuthChange('invitation_expiry_hours', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Completion Throttle Attempts" 
                        value={renderAuthVal('invitation_completion_throttle_attempts')} 
                        onChange={e => handleAuthChange('invitation_completion_throttle_attempts', e.target.value)} 
                      />
                      <Input 
                        type="number" 
                        label="Completion Throttle (Minutes)" 
                        value={renderAuthVal('invitation_completion_throttle_minutes')} 
                        onChange={e => handleAuthChange('invitation_completion_throttle_minutes', e.target.value)} 
                      />
                      <Checkbox 
                        label="Force Password Change on First Login" 
                        checked={renderAuthVal('force_password_change_on_first_login', true) === true || renderAuthVal('force_password_change_on_first_login', true) === 'true'} 
                        onChange={e => handleAuthChange('force_password_change_on_first_login', e.target.checked)} 
                      />
                    </div>
                  </Card>

                  {/* 6. Audit & Data Protection */}
                  <Card>
                    <h3 className="font-bold text-lg mb-4 text-slate-800">6. Audit & Data Protection</h3>
                    <div className="flex flex-col gap-4">
                      <div className="opacity-60 cursor-not-allowed" title="This setting is permanently locked for compliance.">
                        <Checkbox 
                          label="Enable Audit Logging (Permanently Locked)" 
                          checked={true} 
                          onChange={() => handleAuthChange('audit_logging_enabled', false)} 
                        />
                      </div>
                      <div className="opacity-60 cursor-not-allowed" title="This setting is permanently locked for compliance.">
                        <Checkbox 
                          label="Mask Sensitive Data in Logs (Permanently Locked)" 
                          checked={true} 
                          onChange={() => handleAuthChange('mask_sensitive_data_in_logs', false)} 
                        />
                      </div>
                      <Checkbox 
                        label="Require Confirmation for Unmasked Exports" 
                        checked={renderAuthVal('unmasked_export_requires_confirmation', true) === true || renderAuthVal('unmasked_export_requires_confirmation', true) === 'true'} 
                        onChange={e => handleAuthChange('unmasked_export_requires_confirmation', e.target.checked)} 
                      />
                      
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-green-900">Encrypt PII Columns (Bank, PAN, Aadhaar)</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-300">Always On</span>
                        </div>
                        <p className="text-xs text-green-800 mt-1">
                          This is enforced at the database level via Eloquent casts.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title="Modify Locked Setting"
        onClose={() => setConfirmModal({ isOpen: false, key: null, newValue: null, reason: '', confirmText: '' })}
        onConfirm={confirmLockedUpdate}
        confirmText="Update Setting"
        variant="danger"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {confirmModal.type === 'email' ? 'Saving these settings will restart the background queue workers to apply the new configurations.' : <>You are attempting to modify <strong>{confirmModal.key}</strong> which is protected by a compliance lock.</>}
          </p>
          <Input 
            label="Type 'CONFIRM' to proceed" 
            value={confirmModal.confirmText} 
            onChange={e => setConfirmModal(prev => ({ ...prev, confirmText: e.target.value }))}
            placeholder="CONFIRM"
          />
          <div>
            {confirmModal.type !== 'email' && (<><label className="block text-sm font-medium text-gray-700 mb-1">Reason for Modification (Min 10 chars)</label>
            <textarea 
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows="3"
              value={confirmModal.reason}
              onChange={e => setConfirmModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Approved by legal compliance team..."
            ></textarea></>)}
          </div>
        </div>
      </ConfirmDialog>
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
