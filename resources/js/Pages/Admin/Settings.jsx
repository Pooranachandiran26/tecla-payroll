import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
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
    { key: 'email', label: 'Email Delivery' },
    { key: 'slabs', label: 'Statutory Slab Configurations' },
    { key: 'notif', label: 'Notification Setup' },
    { key: 'onboarding', label: 'Onboarding Policy' },
    { key: 'payroll', label: 'Payroll Configuration' },
    { key: 'auth_security', label: 'Authentication & Security' }
  ];

  const ptSlabs = [
    { id: 1, from: '₹0', to: '₹7,500', deduction: '₹0', exceptions: 'Exempted', disabled: true },
    { id: 2, from: '₹7,501', to: '₹10,000', deduction: '₹175 / month', exceptions: 'Standard slab', disabled: false },
    { id: 3, from: '₹10,001', to: 'No Limit', deduction: '₹200 / month', exceptions: '₹300 deducted in February month', disabled: false }
  ];

  // Auth & Security State
  const [authSettings, setAuthSettings] = useState({});
  const [authLoading, setAuthLoading] = useState(false);
  const [emailSettings, setEmailSettings] = useState({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, key: null, newValue: null, reason: '', confirmText: '' });

  useEffect(() => {
    if (activeTab === 'auth_security' && Object.keys(authSettings).length === 0) {
      fetchAuthSettings();
    }
    if (activeTab === 'email' && Object.keys(emailSettings).length === 0) {
      fetchEmailSettings();
    }
  }, [activeTab]);

  const fetchAuthSettings = async () => {
    setAuthLoading(true);
    try {
      const res = await axios.get('/admin/settings/auth-security');
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

  
  const fetchEmailSettings = async () => {
    setEmailLoading(true);
    try {
      const res = await axios.get('/admin/settings/email');
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
      await axios.put('/admin/settings/email', emailSettings);
      showToast({ type: 'success', title: 'Success', message: 'Email settings saved successfully. Workers are restarting.' });
      setConfirmModal({ isOpen: false, key: null, newValue: null, reason: '', confirmText: '', type: null });
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.response?.data?.message || 'Failed to update email settings' });
    }
  };

  const testEmailConnection = async () => {
    setTestingEmail(true);
    try {
      await axios.post('/admin/settings/email/test', emailSettings);
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
      await axios.put('/admin/settings/auth-security', payload);
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

      <Card noPadding>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        
        <div className="p-6">
          {activeTab === 'company' && (
            <form onSubmit={e => { e.preventDefault(); showToast('Company Profile updated successfully!'); }}>
              <div className="flex gap-4 mb-4">
                <div className="flex-1"><Input label="Agency Legal Name" value="Tecla Agency Private Limited" onChange={()=>{}} noMargin /></div>
                <div className="flex-1"><Input label="TAN Number (Tax Deduction Account)" value="MUMT01234B" onChange={()=>{}} noMargin /></div>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1"><Input label="Default Authorized Signatory" value="Rajesh Kumar" onChange={()=>{}} noMargin /></div>
                <div className="flex-1"><Input label="Register Office Address" value="BKC, Bandra East, Mumbai, Maharashtra" onChange={()=>{}} noMargin /></div>
              </div>
              <Button type="submit" variant="primary" className="mt-4">Update Basic Profile</Button>
            </form>
          )}

          {activeTab === 'slabs' && (
            <div>
              <div className="mb-6">
                <h3 className="text-base text-blue-900 font-bold">Professional Tax (PT) Slabs - Maharashtra State</h3>
                <p className="text-xs text-gray-500 mb-4">Customize deduction brackets mapped to employee gross earnings.</p>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <DataTable 
                    columns={[
                      { key: 'from', label: 'Monthly Gross Salary (From)' },
                      { key: 'to', label: 'Monthly Gross Salary (To)' },
                      { key: 'deduction', label: 'Monthly PT Deduction Amount (₹)' },
                      { key: 'exceptions', label: 'Exceptions / Flags' },
                      { key: 'actions', label: 'Actions', render: (_, row) => (
                        <Button 
                          variant={row.disabled ? 'secondary' : 'navy'} 
                          size="xs" 
                          disabled={row.disabled}
                          onClick={() => showToast('PT bracket editing is locked for compliance safety.')}
                        >
                          {row.disabled ? 'Standard' : 'Modify'}
                        </Button>
                      )}
                    ]}
                    data={ptSlabs}
                    keyField="id"
                  />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-xs text-blue-900">
                <strong>Compliance Note:</strong> Tax slabs are pre-synchronized with Central and State Government notifications (updated June 2026). Overriding these slabs manually is audited in the Activity logs.
              </div>
            </div>
          )}

          {activeTab === 'notif' && (
            <div>
              <h3 className="text-base text-blue-900 font-bold mb-4">E-mail Notifications Dispatch targets</h3>
              <div className="flex flex-col gap-4">
                <Checkbox checked={true} onChange={()=>{}} label="Email employee automatically upon final payroll locks (Payslip PDF attached)." />
                <Checkbox checked={true} onChange={()=>{}} label="Nudge Client portal administrators automatically when timesheets are pending over 48 hours." />
                <Checkbox checked={true} onChange={()=>{}} label="Send Admin alert when an employee crossing threshold limit triggers automated ESI locks." />
              </div>
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
                <Select 
                  label="Default LOP Calculation Basis"
                  options={[
                    { value: '26', label: '26 Working Days (excludes Sundays)' },
                    { value: '30', label: '30 Calendar Days' }
                  ]}
                  value="30"
                  onChange={() => showToast('Global LOP Basis updated.')}
                />
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
