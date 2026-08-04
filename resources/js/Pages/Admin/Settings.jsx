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
import { 
  Plus, Trash2, Save, Info, Percent, Receipt, CheckCircle2,
  Building2, Globe, FileText, Palette, Mail, Bell, UserCheck,
  IndianRupee, ShieldCheck, Lock, Image as ImageIcon, Star,
  Sun, Moon, Monitor
} from 'lucide-react';

export default function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  const [docVerify, setDocVerify] = useState(true);

  const tabs = [
    { key: 'company', label: 'Company Profile', icon: Building2 },
    { key: 'localization', label: 'Localization', icon: Globe },
    { key: 'file_upload_policy', label: 'File Upload Policy', icon: FileText },
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'email', label: 'Email Delivery', icon: Mail },
    { key: 'slabs', label: 'Statutory Slab Configurations', icon: Percent },
    { key: 'notif', label: 'Notification Setup', icon: Bell },
    { key: 'onboarding', label: 'Onboarding Policy', icon: UserCheck },
    { key: 'payroll', label: 'Payroll Configuration', icon: IndianRupee },
    { key: 'gst', label: 'GST Settings', icon: Receipt },
    { key: 'auth_security', label: 'Authentication & Security', icon: ShieldCheck }
  ];

  const [ptSlabs, setPtSlabs] = useState([]);
  const [ptSlabsLoading, setPtSlabsLoading] = useState(false);
  const [editingPtSlab, setEditingPtSlab] = useState(null);
  const [savingPtSlab, setSavingPtSlab] = useState(false);

  const [lwfSlabs, setLwfSlabs] = useState([]);
  const [lwfSlabsLoading, setLwfSlabsLoading] = useState(false);
  const [editingLwfSlab, setEditingLwfSlab] = useState(null);
  const [savingLwfSlab, setSavingLwfSlab] = useState(false);

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

  // GST Settings State
  const [gstSettings, setGstSettings] = useState({
    default_gst_rate: '18',
    gst_rates: [
      { rate: '18', label: '18% (Standard Services)', hsn_sac: '998311', description: 'Standard professional / staffing services' },
      { rate: '0',  label: '0% (SEZ / Export without payment of IGST)', hsn_sac: '998311', description: 'Exports / SEZ supplies under LUT' },
      { rate: 'exempt', label: 'Exempt', hsn_sac: '', description: 'Exempt category supplies' },
    ],
    default_reverse_charge: false,
    default_tds_on_agency_fee: 'na',
    notes: ''
  });
  const [gstLoading, setGstLoading] = useState(false);
  const [gstSaving, setGstSaving] = useState(false);

  // Branding State
  const [brandingSettings, setBrandingSettings] = useState({});
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');
  const [brandingColor, setBrandingColor] = useState('#1e3a8a');
  const [brandingAccentGold, setBrandingAccentGold] = useState('#B8860B');
  const [brandingAccentGoldHover, setBrandingAccentGoldHover] = useState('#9c7109');
  const [brandingHeaderTextColor, setBrandingHeaderTextColor] = useState('#FFFFFF');
  const [brandingAgencyName, setBrandingAgencyName] = useState('Tecla Payroll');
  const [brandingTagline, setBrandingTagline] = useState('Enterprise Payroll & HR Portal');
  const [brandingCardRadius, setBrandingCardRadius] = useState('8');
  const [brandingTableDensity, setBrandingTableDensity] = useState('comfortable');
  const [brandingFooterCopyright, setBrandingFooterCopyright] = useState('© 2026 Tecla Payroll. All Rights Reserved.');
  const [brandingEnableFooter, setBrandingEnableFooter] = useState(true);
  const [brandingLoginWelcome, setBrandingLoginWelcome] = useState('Sign in to your account');
  const [brandingNavbarStyle, setBrandingNavbarStyle] = useState('solid');
  const [brandingFontFamily, setBrandingFontFamily] = useState('inter');
  const [brandingContainerWidth, setBrandingContainerWidth] = useState('standard');
  const [brandingButtonEffect, setBrandingButtonEffect] = useState('elevation');
  const [brandingHoverAnimations, setBrandingHoverAnimations] = useState(true);
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
    if (activeTab === 'slabs') {
      if (ptSlabs.length === 0) fetchPtSlabs();
      if (lwfSlabs.length === 0) fetchLwfSlabs();
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
    if (activeTab === 'gst' && !gstLoading) {
      fetchGstSettings();
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

  const savePtSlab = async (e) => {
    e.preventDefault();
    if (!editingPtSlab) return;
    setSavingPtSlab(true);
    try {
      await axios.put(route('admin.settings.pt-slabs.update', editingPtSlab.id), editingPtSlab);
      showToast({ type: 'success', title: 'Success', message: 'PT Slab updated successfully.' });
      setEditingPtSlab(null);
      fetchPtSlabs();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to update PT Slab' });
    } finally {
      setSavingPtSlab(false);
    }
  };

  const fetchLwfSlabs = async () => {
    setLwfSlabsLoading(true);
    try {
      const res = await axios.get(route('admin.settings.lwf-slabs'));
      setLwfSlabs(res.data);
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load LWF slabs' });
    } finally {
      setLwfSlabsLoading(false);
    }
  };

  const saveLwfSlab = async (e) => {
    e.preventDefault();
    if (!editingLwfSlab) return;
    setSavingLwfSlab(true);
    try {
      await axios.put(route('admin.settings.lwf-slabs.update', editingLwfSlab.id), editingLwfSlab);
      showToast({ type: 'success', title: 'Success', message: 'LWF Slab updated successfully.' });
      setEditingLwfSlab(null);
      fetchLwfSlabs();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to update LWF Slab' });
    } finally {
      setSavingLwfSlab(false);
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
      router.reload({ preserveScroll: true });
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

  // ── GST Settings Functions ──────────────────────────────
  const fetchGstSettings = async () => {
    setGstLoading(true);
    try {
      const res = await axios.get(route('admin.settings.gst.show'));
      if (res.data && Object.keys(res.data).length > 0) {
        let rates = res.data.gst_rates;
        if (typeof rates === 'string') {
          try { rates = JSON.parse(rates); } catch(e) {}
        }
        setGstSettings(prev => ({
          ...prev,
          ...res.data,
          gst_rates: Array.isArray(rates) ? rates : prev.gst_rates
        }));
      }
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to load GST settings' });
    } finally {
      setGstLoading(false);
    }
  };

  const saveGstSettings = async (e) => {
    e.preventDefault();
    setGstSaving(true);
    try {
      const payload = {
        ...gstSettings,
        default_gst_rate: String(gstSettings.default_gst_rate || '18'),
        default_reverse_charge: Boolean(gstSettings.default_reverse_charge),
        default_tds_on_agency_fee: String(gstSettings.default_tds_on_agency_fee || 'na'),
        notes: String(gstSettings.notes || ''),
        gst_rates: (gstSettings.gst_rates || []).map(r => ({
          rate: String(r.rate || ''),
          label: String(r.label || ''),
          hsn_sac: String(r.hsn_sac || ''),
          description: String(r.description || '')
        }))
      };

      const res = await axios.put(route('admin.settings.gst.update'), payload);
      showToast({ type: 'success', title: 'Saved', message: res.data?.message || 'GST settings updated successfully!' });
      
      // Re-fetch to ensure state sync with DB
      const freshRes = await axios.get(route('admin.settings.gst.show'));
      if (freshRes.data && freshRes.data.gst_rates) {
        let freshRates = freshRes.data.gst_rates;
        if (typeof freshRates === 'string') {
          try { freshRates = JSON.parse(freshRates); } catch(e) {}
        }
        setGstSettings(prev => ({
          ...prev,
          ...freshRes.data,
          gst_rates: Array.isArray(freshRates) ? freshRates : prev.gst_rates
        }));
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save GST settings' });
    } finally {
      setGstSaving(false);
    }
  };

  // ── Branding Functions ──────────────────────────────
  const fetchBrandingSettings = async () => {
    setBrandingLoading(true);
    try {
      const res = await axios.get(route('admin.settings.branding.show'));
      setBrandingSettings(res.data);
      setBrandingColor(res.data.primary_color || '#1e3a8a');
      setBrandingAccentGold(res.data.accent_gold_color || '#B8860B');
      setBrandingAccentGoldHover(res.data.accent_gold_hover_color || '#9c7109');
      setBrandingHeaderTextColor(res.data.header_text_color || '#FFFFFF');
      setBrandingAgencyName(res.data.agency_display_name || 'Tecla Payroll');
      setBrandingTagline(res.data.portal_tagline || 'Enterprise Payroll & HR Portal');
      setBrandingCardRadius(res.data.card_corner_radius || '8');
      setBrandingTableDensity(res.data.table_density || 'comfortable');
      setBrandingFooterCopyright(res.data.footer_copyright_text || '© 2026 Tecla Payroll. All Rights Reserved.');
      setBrandingEnableFooter(res.data.enable_footer_notice !== '0');
      setBrandingLoginWelcome(res.data.login_welcome_message || 'Sign in to your account');
      setBrandingNavbarStyle(res.data.navbar_style || 'solid');
      setBrandingFontFamily(res.data.font_family || 'inter');
      setBrandingContainerWidth(res.data.container_layout_width || 'standard');
      setBrandingButtonEffect(res.data.button_hover_effect || 'elevation');
      setBrandingHoverAnimations(res.data.enable_hover_animations !== '0');
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
      formData.append('accent_gold_color', brandingAccentGold);
      formData.append('accent_gold_hover_color', brandingAccentGoldHover);
      formData.append('header_text_color', brandingHeaderTextColor);
      formData.append('agency_display_name', brandingAgencyName);
      formData.append('portal_tagline', brandingTagline);
      formData.append('card_corner_radius', brandingCardRadius);
      formData.append('table_density', brandingTableDensity);
      formData.append('footer_copyright_text', brandingFooterCopyright);
      formData.append('enable_footer_notice', brandingEnableFooter ? '1' : '0');
      formData.append('login_welcome_message', brandingLoginWelcome);
      formData.append('navbar_style', brandingNavbarStyle);
      formData.append('font_family', brandingFontFamily);
      formData.append('container_layout_width', brandingContainerWidth);
      formData.append('button_hover_effect', brandingButtonEffect);
      formData.append('enable_hover_animations', brandingHoverAnimations ? '1' : '0');

      await axios.post(route('admin.settings.branding.update'), formData);

      showToast({ type: 'success', title: 'Success', message: 'Branding settings saved successfully!' });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save branding settings' });
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
      confirmText: 'CONFIRM'
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
      setConfirmModal({ isOpen: true, key, newValue, reason: 'Modified locked setting by admin', confirmText: 'CONFIRM' });
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
      confirmEmailUpdate();
      return;
    }
    updateAuthSetting(confirmModal.key, confirmModal.newValue, {
      confirm_text: 'CONFIRM',
      reason: confirmModal.reason || 'Modified locked setting by admin'
    });
  };

  const renderAuthVal = (key, fallback = '') => authSettings[key]?.value ?? fallback;

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="admin">
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
            {tabs.map(tab => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <li key={tab.key}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-50/70 text-[#1F3864] border-l-4 border-[#1F3864] font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {IconComp && <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1F3864]' : 'text-gray-400'}`} />}
                      <span>{tab.label}</span>
                    </div>
                  </button>
                </li>
              );
            })}
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
                      <Input label="PF Establishment Code" value={companySettings.pf_establishment_code || ''} onChange={e => handleCompanyChange('pf_establishment_code', e.target.value)} placeholder="e.g. MH/BAN/1234567/000" noMargin />
                      <p className="text-xs text-gray-500 mt-1">📌 Required for statutory PF return filing for <strong>Agency Contract</strong> employees.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <Input label="ESI Code Number" value={companySettings.esi_code_number || ''} onChange={e => handleCompanyChange('esi_code_number', e.target.value)} placeholder="e.g. 31001234560001001" noMargin />
                      <p className="text-xs text-gray-500 mt-1">📌 Required for statutory ESI return filing for <strong>Agency Contract</strong> employees.</p>
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
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800">Professional Tax (PT) Slabs</h3>
                <p className="text-sm text-gray-500">PT rates dynamically map to employee work states for accurate monthly deduction.</p>
              </div>

              {/* Statutory Compliance Note for Half-Yearly States */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-950 flex items-start gap-3">
                <div className="text-lg mt-0.5">ℹ️</div>
                <div>
                  <h4 className="font-bold text-blue-900 text-sm mb-1">State Statutory Calculation Rules</h4>
                  <p className="leading-relaxed mb-2">
                    <strong>Maharashtra & Karnataka:</strong> Professional Tax is legislated on a <strong>Monthly Gross Salary</strong> basis.
                  </p>
                  <p className="leading-relaxed">
                    <strong>Tamil Nadu:</strong> Legislate Professional Tax on a <strong>6-Month (Half-Yearly) Gross Income</strong> basis per <em>Tamil Nadu Municipalities Rules 1992</em>. Tecla Payroll automatically converts half-yearly govt brackets into <strong>Monthly Equivalent Salary Brackets</strong> (divided by 6) and deducts 1/6th of the half-yearly tax amount each month for a smooth monthly payroll calculation (e.g. Govt Half-Yearly ₹45,001–₹60,000 = ₹7,501–₹10,000/mo $\rightarrow$ ₹930/half-year = ₹155/month).
                  </p>
                </div>
              </div>
              
              {ptSlabsLoading ? (
                <div>Loading Slabs...</div>
              ) : (
                <DataTable 
                  columns={[
                    { 
                      label: 'State', 
                      key: 'state',
                      render: (_, row) => (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {row.state}
                        </span>
                      )
                    },
                    { label: 'Monthly Gross From', key: 'from' },
                    { label: 'Monthly Gross To', key: 'to' },
                    { label: 'Monthly Deduction', key: 'deduction' },
                    { 
                      label: 'Frequency', 
                      key: 'frequency',
                      render: (_, row) => (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${row.frequency === 'half_yearly' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {row.frequency === 'half_yearly' ? 'Half-Yearly' : 'Monthly'}
                        </span>
                      )
                    },
                    { 
                      label: 'Official Govt Slab (Half-Yearly)', 
                      key: 'half_yearly_range',
                      render: (_, row) => row.half_yearly_range ? (
                        <div className="text-xs">
                          <span className="font-semibold text-slate-700">{row.half_yearly_range}</span>
                          <div className="text-slate-500 font-mono">Tax: {row.half_yearly_tax} / half-year</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A (Monthly State)</span>
                      )
                    },
                    { label: 'Exceptions/Notes', key: 'exceptions' },
                    { 
                      label: 'Action', 
                      key: 'id',
                      render: (_, row) => (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => setEditingPtSlab({ ...row })}
                        >
                          Modify
                        </Button>
                      )
                    }
                  ]}
                  data={ptSlabs}
                />
              )}

              {/* Edit PT Slab Modal */}
              <Modal
                isOpen={!!editingPtSlab}
                onClose={() => setEditingPtSlab(null)}
                title={`Modify PT Slab (${editingPtSlab?.state || ''})`}
                size="md"
              >
                {editingPtSlab && (
                  <form onSubmit={savePtSlab} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="State" 
                        value={editingPtSlab.state || ''} 
                        onChange={e => setEditingPtSlab({ ...editingPtSlab, state: e.target.value })} 
                        required 
                      />
                      <Select 
                        label="Frequency" 
                        value={editingPtSlab.frequency || 'monthly'} 
                        onChange={e => setEditingPtSlab({ ...editingPtSlab, frequency: e.target.value })} 
                        options={[
                          { value: 'monthly', label: 'Monthly' },
                          { value: 'half_yearly', label: 'Half-Yearly' }
                        ]} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        type="number" 
                        label="Min Salary (From Gross ₹)" 
                        value={editingPtSlab.min_salary ?? ''} 
                        onChange={e => setEditingPtSlab({ ...editingPtSlab, min_salary: parseFloat(e.target.value) || 0 })} 
                        required 
                      />
                      <Input 
                        type="number" 
                        label="Max Salary (To Gross ₹ — leave blank if No Limit)" 
                        value={editingPtSlab.max_salary ?? ''} 
                        onChange={e => setEditingPtSlab({ ...editingPtSlab, max_salary: e.target.value === '' ? null : parseFloat(e.target.value) })} 
                        placeholder="No Limit" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        type="number" 
                        label="Deduction Amount (₹)" 
                        value={editingPtSlab.deduction_amount ?? ''} 
                        onChange={e => setEditingPtSlab({ ...editingPtSlab, deduction_amount: parseFloat(e.target.value) || 0 })} 
                        required 
                      />
                      <Input 
                        label="Deduction Note" 
                        value={editingPtSlab.deduction_note || ''} 
                        onChange={e => setEditingPtSlab({ ...editingPtSlab, deduction_note: e.target.value })} 
                        placeholder="e.g. / month" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exceptions & Statutory Notes</label>
                      <textarea 
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        rows={3} 
                        value={editingPtSlab.exceptions_text || ''} 
                        onChange={e => setEditingPtSlab({ ...editingPtSlab, exceptions_text: e.target.value })} 
                        placeholder="e.g. Women earning <= Rs 25,000 exempt..." 
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="secondary" onClick={() => setEditingPtSlab(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" disabled={savingPtSlab}>
                        {savingPtSlab ? 'Saving...' : 'Update PT Slab'}
                      </Button>
                    </div>
                  </form>
                )}
              </Modal>

              {/* Labour Welfare Fund (LWF) Slabs Section */}
              <div className="mt-10 border-t border-gray-200 pt-8">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Labour Welfare Fund (LWF) State Rates</h3>
                  <p className="text-sm text-gray-500">Statutory employee and employer contributions per state and frequency schedule.</p>
                </div>

                {lwfSlabsLoading ? (
                  <div>Loading LWF Slabs...</div>
                ) : (
                  <DataTable 
                    columns={[
                      { 
                        label: 'State', 
                        key: 'state',
                        render: (_, row) => (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                            {row.state}
                          </span>
                        )
                      },
                      { label: 'Employee Contribution', key: 'employee_formatted' },
                      { label: 'Employer Contribution', key: 'employer_formatted' },
                      { label: 'Total Contribution', key: 'total_formatted' },
                      { 
                        label: 'Deduction Schedule', 
                        key: 'frequency',
                        render: (_, row) => (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 uppercase">
                            {row.frequency === 'half_yearly' ? 'Bi-Annual (Jun & Dec)' : row.frequency === 'yearly' ? 'Annual (Dec)' : 'Monthly'}
                          </span>
                        )
                      },
                      { 
                        label: 'Action', 
                        key: 'id',
                        render: (_, row) => (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setEditingLwfSlab({ ...row })}
                          >
                            Modify
                          </Button>
                        )
                      }
                    ]}
                    data={lwfSlabs}
                  />
                )}

                {/* Edit LWF Slab Modal */}
                <Modal
                  isOpen={!!editingLwfSlab}
                  onClose={() => setEditingLwfSlab(null)}
                  title={`Modify LWF Slab (${editingLwfSlab?.state || ''})`}
                  size="md"
                >
                  {editingLwfSlab && (
                    <form onSubmit={saveLwfSlab} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="State" 
                          value={editingLwfSlab.state || ''} 
                          onChange={e => setEditingLwfSlab({ ...editingLwfSlab, state: e.target.value })} 
                          required 
                        />
                        <Select 
                          label="Deduction Schedule" 
                          value={editingLwfSlab.frequency || 'yearly'} 
                          onChange={e => setEditingLwfSlab({ ...editingLwfSlab, frequency: e.target.value })} 
                          options={[
                            { value: 'half_yearly', label: 'Bi-Annual (Jun & Dec)' },
                            { value: 'yearly', label: 'Annual (Dec Only)' },
                            { value: 'monthly', label: 'Monthly' }
                          ]} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          type="number" 
                          label="Employee Contribution (₹)" 
                          value={editingLwfSlab.employee_contribution ?? ''} 
                          onChange={e => setEditingLwfSlab({ ...editingLwfSlab, employee_contribution: parseFloat(e.target.value) || 0 })} 
                          required 
                        />
                        <Input 
                          type="number" 
                          label="Employer Contribution (₹)" 
                          value={editingLwfSlab.employer_contribution ?? ''} 
                          onChange={e => setEditingLwfSlab({ ...editingLwfSlab, employer_contribution: parseFloat(e.target.value) || 0 })} 
                          required 
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setEditingLwfSlab(null)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={savingLwfSlab}>
                          {savingLwfSlab ? 'Saving...' : 'Update LWF Slab'}
                        </Button>
                      </div>
                    </form>
                  )}
                </Modal>
              </div>
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
                            <ImageIcon className="w-10 h-10 text-indigo-600/70 mx-auto mb-2" />
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
                            <Star className="w-10 h-10 text-amber-500/80 mx-auto mb-2" />
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

                  {/* 1-Click Curated Theme Presets */}
                  <Card title="1-Click Theme Presets & Color Schemes">
                    <p className="text-xs text-gray-500 mb-4">Click any curated color scheme below to instantly apply harmonious brand colors across your portal.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {[
                        { name: 'Executive Navy', primary: '#1F3864', accent: '#B8860B', hover: '#9C7109' },
                        { name: 'Emerald Corporate', primary: '#064E3B', accent: '#10B981', hover: '#059669' },
                        { name: 'Royal Indigo', primary: '#312E81', accent: '#F59E0B', hover: '#D97706' },
                        { name: 'Obsidian Slate', primary: '#0F172A', accent: '#06B6D4', hover: '#0891B2' },
                        { name: 'Deep Burgundy', primary: '#4C0519', accent: '#D97706', hover: '#B45309' },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setBrandingColor(preset.primary);
                            setBrandingAccentGold(preset.accent);
                            setBrandingAccentGoldHover(preset.hover);
                          }}
                          className="p-3 border rounded-xl hover:shadow-md transition-all text-left group bg-white"
                          style={{ borderColor: preset.primary === brandingColor ? preset.accent : '#e2e8f0' }}
                        >
                          <div className="flex gap-1.5 mb-2">
                            <div className="w-5 h-5 rounded-full shadow-xs" style={{ backgroundColor: preset.primary }} />
                            <div className="w-5 h-5 rounded-full shadow-xs" style={{ backgroundColor: preset.accent }} />
                            <div className="w-5 h-5 rounded-full shadow-xs" style={{ backgroundColor: preset.hover }} />
                          </div>
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{preset.name}</p>
                          <span className="text-[10px] text-gray-400 font-mono">{preset.primary}</span>
                        </button>
                      ))}
                    </div>
                  </Card>

                  {/* Live Interactive UI & Theme Preview */}
                  <div className="mt-6 mb-6">
                    <Card title="Live Real-Time UI Preview">
                      <p className="text-xs text-gray-500 mb-3">Live mockup preview of your active color, header, corner radius, and padding density choices before saving.</p>
                      <div className="border rounded-xl overflow-hidden shadow-xs bg-slate-50">
                        {/* Header Preview */}
                        <div 
                          className="px-4 py-2.5 flex items-center justify-between transition-all"
                          style={{
                            backgroundColor: brandingNavbarStyle === 'glassmorphism' ? 'rgba(31, 56, 100, 0.85)' : brandingColor,
                            color: brandingHeaderTextColor,
                            backdropFilter: brandingNavbarStyle === 'glassmorphism' ? 'blur(8px)' : 'none',
                          }}
                        >
                          <div className="flex items-center gap-2 font-bold text-sm">
                            {logoPreview ? (
                              <img src={logoPreview} alt="Logo" style={{ maxHeight: '20px' }} />
                            ) : (
                              <span>{brandingAgencyName || 'Tecla Payroll'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs opacity-90 font-medium">
                            <span>Dashboard</span>
                            <span>Employees</span>
                            <span>Payroll</span>
                            <span className="font-bold underline" style={{ color: brandingAccentGold }}>Settings</span>
                          </div>
                        </div>

                        {/* Body Preview */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h6 className="text-xs font-bold text-slate-800">{brandingTagline || 'Enterprise Payroll & HR Portal'}</h6>
                              <p className="text-[11px] text-gray-500">{brandingLoginWelcome}</p>
                            </div>
                            <button 
                              type="button"
                              className="text-xs px-3 py-1.5 font-semibold text-white shadow-xs transition-all cursor-pointer"
                              style={{ 
                                backgroundColor: brandingAccentGold, 
                                borderRadius: `${brandingCardRadius}px`,
                              }}
                            >
                              Sample Action Button
                            </button>
                          </div>

                          {/* Table Density Preview */}
                          <div className="border rounded bg-white overflow-hidden text-xs">
                            <table className="w-full text-left">
                              <thead className="bg-slate-100 font-semibold text-slate-700">
                                <tr>
                                  <th style={{ padding: brandingTableDensity === 'compact' ? '4px 8px' : '10px 12px' }}>Employee</th>
                                  <th style={{ padding: brandingTableDensity === 'compact' ? '4px 8px' : '10px 12px' }}>Department</th>
                                  <th style={{ padding: brandingTableDensity === 'compact' ? '4px 8px' : '10px 12px' }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-t border-slate-100">
                                  <td style={{ padding: brandingTableDensity === 'compact' ? '4px 8px' : '10px 12px' }}>Rajesh Kumar</td>
                                  <td style={{ padding: brandingTableDensity === 'compact' ? '4px 8px' : '10px 12px' }}>Engineering</td>
                                  <td style={{ padding: brandingTableDensity === 'compact' ? '4px 8px' : '10px 12px' }}>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-100">ACTIVE</span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Footer Preview */}
                        {brandingEnableFooter && (
                          <div className="px-4 py-2 border-t text-center text-[11px] text-gray-500 bg-white">
                            {brandingFooterCopyright}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Color & Theme Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Primary Color */}
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-1">Primary Brand Color</h4>
                      <p className="text-xs text-gray-500 mb-4">Header backgrounds, primary buttons & main accents.</p>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={brandingColor}
                          onChange={(e) => setBrandingColor(e.target.value)}
                          style={{ width: '42px', height: '42px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
                        />
                        <div>
                          <input 
                            type="text" 
                            value={brandingColor}
                            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBrandingColor(e.target.value); }}
                            className="border border-gray-300 rounded-md px-2.5 py-1 text-sm font-mono"
                            style={{ width: '100px' }}
                            placeholder="#1e3a8a"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">Primary Hex</p>
                        </div>
                        <div style={{ width: '40px', height: '36px', backgroundColor: brandingColor, borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                      </div>
                    </Card>

                    {/* Secondary Color */}
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-1">Secondary Color</h4>
                      <p className="text-xs text-gray-500 mb-4">Secondary buttons (e.g. Save Branding), highlights & active badges.</p>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={brandingAccentGold}
                          onChange={(e) => setBrandingAccentGold(e.target.value)}
                          style={{ width: '42px', height: '42px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
                        />
                        <div>
                          <input 
                            type="text" 
                            value={brandingAccentGold}
                            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBrandingAccentGold(e.target.value); }}
                            className="border border-gray-300 rounded-md px-2.5 py-1 text-sm font-mono"
                            style={{ width: '100px' }}
                            placeholder="#B8860B"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">Secondary Hex</p>
                        </div>
                        <div style={{ width: '40px', height: '36px', backgroundColor: brandingAccentGold, borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                      </div>
                    </Card>

                    {/* Secondary Hover Color */}
                    <Card>
                      <h4 className="font-semibold text-slate-800 mb-1">Secondary Hover Color</h4>
                      <p className="text-xs text-gray-500 mb-4">Hover state for secondary buttons, interactive triggers & focus outlines.</p>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={brandingAccentGoldHover}
                          onChange={(e) => setBrandingAccentGoldHover(e.target.value)}
                          style={{ width: '42px', height: '42px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: '2px' }}
                        />
                        <div>
                          <input 
                            type="text" 
                            value={brandingAccentGoldHover}
                            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBrandingAccentGoldHover(e.target.value); }}
                            className="border border-gray-300 rounded-md px-2.5 py-1 text-sm font-mono"
                            style={{ width: '100px' }}
                            placeholder="#9c7109"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">Hover Hex</p>
                        </div>
                        <div style={{ width: '40px', height: '36px', backgroundColor: brandingAccentGoldHover, borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                      </div>
                    </Card>
                  </div>

                  {/* Advanced Portal Identity & Customization Row */}
                  <div className="mt-6">
                    <Card title="Advanced Portal Identity & Header Customization">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Input 
                            label="Agency / System Display Name" 
                            value={brandingAgencyName}
                            onChange={(e) => setBrandingAgencyName(e.target.value)}
                            placeholder="Tecla Payroll"
                            helpText="Appears in page headers when logo is omitted, browser title & system emails."
                          />
                        </div>
                        <div>
                          <Input 
                            label="Portal Subtitle / System Tagline" 
                            value={brandingTagline}
                            onChange={(e) => setBrandingTagline(e.target.value)}
                            placeholder="Enterprise Payroll & HR Portal"
                            helpText="Displayed on the login portal screen and employee welcome emails."
                          />
                        </div>
                        <div>
                          <Input 
                            label="Login Card Welcome Heading" 
                            value={brandingLoginWelcome}
                            onChange={(e) => setBrandingLoginWelcome(e.target.value)}
                            placeholder="Sign in to your account"
                            helpText="Custom greeting displayed at the top of the authentication card."
                          />
                        </div>
                        <div>
                          <Select 
                            label="Top Navigation Bar Visual Style"
                            options={[
                              { value: 'solid', label: 'Solid Brand Color (Classic Dark Navy)' },
                              { value: 'glassmorphism', label: 'Modern Glassmorphism (Translucent Blur)' },
                            ]}
                            value={brandingNavbarStyle}
                            onChange={(e) => setBrandingNavbarStyle(e.target.value)}
                            helpText="Applies sleek translucent frosted glass styling to the main navigation header."
                          />
                        </div>
                      </div>

                      <div className="mt-6 border-t border-gray-100 pt-5 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Header Navigation Text Color</h5>
                          <p className="text-xs text-gray-500">Custom contrast color for top navigation links & brand text.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={brandingHeaderTextColor}
                            onChange={(e) => setBrandingHeaderTextColor(e.target.value)}
                            style={{ width: '38px', height: '38px', border: '2px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
                          />
                          <input 
                            type="text" 
                            value={brandingHeaderTextColor}
                            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBrandingHeaderTextColor(e.target.value); }}
                            className="border border-gray-300 rounded-md px-2.5 py-1 text-sm font-mono"
                            style={{ width: '90px' }}
                            placeholder="#FFFFFF"
                          />
                          <div style={{ width: '36px', height: '32px', backgroundColor: brandingHeaderTextColor, borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        </div>
                      </div>

                      {/* UI & Layout Density Options */}
                      <div className="mt-6 border-t border-gray-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Select 
                          label="Card & Button Corner Styling"
                          options={[
                            { value: '4', label: 'Sharp Corners (Minimalist — 4px)' },
                            { value: '8', label: 'Standard Rounded (Default — 8px)' },
                            { value: '12', label: 'Extra Smooth (Modern — 12px)' },
                          ]}
                          value={brandingCardRadius}
                          onChange={(e) => setBrandingCardRadius(e.target.value)}
                          helpText="Controls border curvature across cards, buttons, and input fields."
                        />

                        <Select 
                          label="Data Table Padding Density"
                          options={[
                            { value: 'comfortable', label: 'Comfortable Density (Standard Spacing)' },
                            { value: 'compact', label: 'High Density (Compact View for Large Rosters)' },
                          ]}
                          value={brandingTableDensity}
                          onChange={(e) => setBrandingTableDensity(e.target.value)}
                          helpText="Adjusts vertical row padding on data tables throughout the app."
                        />

                        <Select 
                          label="System Typography & Font Family"
                          options={[
                            { value: 'inter', label: 'Inter (Clean & Modern Default)' },
                            { value: 'roboto', label: 'Roboto (Corporate Professional)' },
                            { value: 'outfit', label: 'Outfit (Sleek Geometric Tech)' },
                            { value: 'poppins', label: 'Poppins (Friendly & Rounded)' },
                          ]}
                          value={brandingFontFamily}
                          onChange={(e) => setBrandingFontFamily(e.target.value)}
                          helpText="Custom font family applied dynamically across all headings, cards, and data tables."
                        />

                        <Select 
                          label="Main Page Layout Container Width"
                          options={[
                            { value: 'standard', label: 'Standard Centered (1280px Max Width)' },
                            { value: 'full', label: 'Full Fluid Screen (100% Widescreen Display)' },
                          ]}
                          value={brandingContainerWidth}
                          onChange={(e) => setBrandingContainerWidth(e.target.value)}
                          helpText="Controls max container width of dashboards and management tables."
                        />

                        <Select 
                          label="Action Button Hover Interaction Effect"
                          options={[
                            { value: 'elevation', label: 'Subtle Lift & Shadow Elevation (Default)' },
                            { value: 'glow', label: 'Luminous Glow Accent Ring' },
                            { value: 'solid', label: 'Classic Solid Color Fade' },
                          ]}
                          value={brandingButtonEffect}
                          onChange={(e) => setBrandingButtonEffect(e.target.value)}
                          helpText="Defines the micro-animation style when hovering action buttons across the app."
                        />
                      </div>

                      <div className="mt-5 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-0.5">Portal Footer Notice</h5>
                            <p className="text-xs text-gray-500">Show or hide the bottom footer notice across login & app pages.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={brandingEnableFooter}
                              onChange={(e) => setBrandingEnableFooter(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-2 text-xs font-semibold text-gray-700">
                              {brandingEnableFooter ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </label>
                        </div>

                        {brandingEnableFooter && (
                          <Input 
                            label="Footer Copyright & Support Notice"
                            value={brandingFooterCopyright}
                            onChange={(e) => setBrandingFooterCopyright(e.target.value)}
                            placeholder="© 2026 Tecla Payroll. All Rights Reserved."
                            helpText="Custom organization footer line displayed across exported reports & portal footers."
                          />
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button onClick={saveBrandingSettings} disabled={brandingSaving}>
                      {brandingSaving ? 'Saving...' : 'Save Branding Settings'}
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

          {activeTab === 'gst' && (
            <div className="max-w-4xl">
              <h3 className="text-base text-blue-900 font-bold mb-1">GST / Taxation Settings</h3>
              <p className="text-sm text-gray-500 mb-6">
                Configure the GST Application Rate and related taxation defaults. The <strong>Default GST Rate</strong> is pre-filled on the Client Create / Edit form and can be overridden per client.
              </p>

              {gstLoading ? (
                <div className="text-sm text-gray-500">Loading GST settings...</div>
              ) : (
                <form onSubmit={saveGstSettings} className="space-y-6">

                  {/* Default Rate Card */}
                  <Card title="Default GST Application Rate" noPadding>
                    <div className="p-4 space-y-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800 flex items-start gap-2">
                        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          This is the system-wide <strong>default</strong> rate. Clients in SEZ / Export categories should have their rate overridden to 0% at the client level.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default GST Rate <span className="text-red-500">*</span>
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={gstSettings.default_gst_rate || '18'}
                            onChange={e => setGstSettings(prev => ({ ...prev, default_gst_rate: e.target.value }))}
                          >
                            {(gstSettings.gst_rates || []).map(r => (
                              <option key={r.rate} value={r.rate}>{r.label}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Pre-filled on all new client forms. Can be changed per client.</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Default TDS on Agency Fee</label>
                          <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={gstSettings.default_tds_on_agency_fee || 'na'}
                            onChange={e => setGstSettings(prev => ({ ...prev, default_tds_on_agency_fee: e.target.value }))}
                          >
                            <option value="na">Not Applicable</option>
                            <option value="1">1% (Manpower Contracts — 194C)</option>
                            <option value="2">2% (Technical Services — 194J)</option>
                            <option value="10">10% (Professional Services — 194J)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Default TDS deductible from agency fees on invoices.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md bg-slate-50">
                        <input
                          type="checkbox"
                          id="default_reverse_charge"
                          checked={Boolean(gstSettings.default_reverse_charge)}
                          onChange={e => setGstSettings(prev => ({ ...prev, default_reverse_charge: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          style={{ width: '16px', height: '16px' }}
                        />
                        <label htmlFor="default_reverse_charge" className="text-sm font-medium text-gray-700 cursor-pointer">
                          Enable Reverse Charge Mechanism (RCM) by default
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 -mt-2">When enabled, GST liability is shifted to the client (recipient). Active invoices will bear a 'Reverse Charge Applicable' note.</p>
                    </div>
                  </Card>

                  {/* GST Rate Table */}
                  <Card 
                    title="GST Rate Master Options" 
                    noPadding 
                    headerAction={
                      <button
                        type="button"
                        onClick={() => {
                          setGstSettings(prev => ({
                            ...prev,
                            gst_rates: [
                              ...(prev.gst_rates || []),
                              { rate: '5', label: '5% (Low Rate Services)', hsn_sac: '998311', description: 'Custom 5% GST Rate' }
                            ]
                          }));
                        }}
                        style={{
                          background: 'var(--primary-navy, #1e3a8a)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} /> Add GST Rate Option
                      </button>
                    }
                  >
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-3">
                        Manage all GST Application Rate options. Added options automatically populate the GST rate selection dropdown on client forms.
                      </p>
                      <div className="overflow-x-auto">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                          <thead>
                            <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151', width: '110px' }}>Rate Value</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151' }}>Label / Title</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151', width: '120px' }}>HSN/SAC Code</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151' }}>Description</th>
                              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151', width: '80px' }}>Default?</th>
                              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151', width: '70px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(gstSettings.gst_rates || []).map((r, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  <input
                                    className="border border-gray-300 rounded px-2 py-1 text-sm font-bold w-full"
                                    value={r.rate}
                                    placeholder="e.g. 18 or exempt"
                                    onChange={e => {
                                      const rates = [...(gstSettings.gst_rates || [])];
                                      rates[idx] = { ...rates[idx], rate: e.target.value };
                                      setGstSettings(prev => ({ ...prev, gst_rates: rates }));
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  <input
                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                    value={r.label}
                                    placeholder="Dropdown Option Label"
                                    onChange={e => {
                                      const rates = [...(gstSettings.gst_rates || [])];
                                      rates[idx] = { ...rates[idx], label: e.target.value };
                                      setGstSettings(prev => ({ ...prev, gst_rates: rates }));
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  <input
                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full font-mono"
                                    value={r.hsn_sac || ''}
                                    placeholder="e.g. 998311"
                                    onChange={e => {
                                      const rates = [...(gstSettings.gst_rates || [])];
                                      rates[idx] = { ...rates[idx], hsn_sac: e.target.value };
                                      setGstSettings(prev => ({ ...prev, gst_rates: rates }));
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                  <input
                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                    value={r.description || ''}
                                    placeholder="Short description"
                                    onChange={e => {
                                      const rates = [...(gstSettings.gst_rates || [])];
                                      rates[idx] = { ...rates[idx], description: e.target.value };
                                      setGstSettings(prev => ({ ...prev, gst_rates: rates }));
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                                  <input
                                    type="radio"
                                    name="default_gst_rate_table"
                                    checked={gstSettings.default_gst_rate === r.rate}
                                    onChange={() => setGstSettings(prev => ({ ...prev, default_gst_rate: r.rate }))}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    title="Delete Option"
                                    disabled={(gstSettings.gst_rates || []).length <= 1}
                                    onClick={() => {
                                      setGstSettings(prev => ({
                                        ...prev,
                                        gst_rates: (prev.gst_rates || []).filter((_, i) => i !== idx)
                                      }));
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: (gstSettings.gst_rates || []).length <= 1 ? '#CBD5E1' : '#EF4444',
                                      cursor: (gstSettings.gst_rates || []).length <= 1 ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0.2rem 0.4rem'
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setGstSettings(prev => ({
                              ...prev,
                              gst_rates: [
                                ...(prev.gst_rates || []),
                                { rate: '12', label: '12% (Reduced Rate Services)', hsn_sac: '998311', description: '12% GST Rate' }
                              ]
                            }));
                          }}
                          style={{
                            background: '#F1F5F9',
                            color: '#1E293B',
                            border: '1px solid #CBD5E1',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={14} /> Add Another Option
                        </button>
                        <span className="text-xs text-gray-500">{(gstSettings.gst_rates || []).length} rate options configured</span>
                      </div>
                    </div>
                  </Card>

                  {/* Notes */}
                  <Card title="GST Compliance Notes" noPadding>
                    <div className="p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes / Auditor Reference</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={gstSettings.notes || ''}
                        onChange={e => setGstSettings(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="e.g. Per GST Notification No. 20/2019, staffing services attract 18% GST under SAC 998311..."
                      />
                    </div>
                  </Card>

                  <Button type="submit" variant="primary" disabled={gstSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={15} /> {gstSaving ? 'Saving...' : 'Save GST Settings'}
                  </Button>
                </form>
              )}
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
        title={confirmModal.type === 'email' ? 'Restart Queue Workers & Update Email' : 'Modify Locked Setting'}
        message={confirmModal.type === 'email' ? 'Saving these settings will restart the background queue workers to apply the new configurations. Are you sure you want to proceed?' : `Are you sure you want to modify ${confirmModal.key}?`}
        onClose={() => setConfirmModal({ isOpen: false, key: null, newValue: null, reason: '', confirmText: '' })}
        onConfirm={confirmLockedUpdate}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="danger"
      />
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
