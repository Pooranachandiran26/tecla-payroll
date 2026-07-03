import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';
import Tabs from '../../Components/ui/Tabs';
import Input from '../../Components/ui/Input';
import Select from '../../Components/ui/Select';
import Button from '../../Components/ui/Button';
import DataTable from '../../Components/ui/DataTable';
import Checkbox from '../../Components/ui/Checkbox';
import useToast from '../../Hooks/useToast';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  const [docVerify, setDocVerify] = useState(true);

  const tabs = [
    { id: 'company', label: 'Company Profile' },
    { id: 'slabs', label: 'Statutory Slab Configurations' },
    { id: 'notif', label: 'Notification Setup' },
    { id: 'onboarding', label: 'Onboarding Policy' },
    { id: 'payroll', label: 'Payroll Configuration' }
  ];

  const ptSlabs = [
    { id: 1, from: '₹0', to: '₹7,500', deduction: '₹0', exceptions: 'Exempted', disabled: true },
    { id: 2, from: '₹7,501', to: '₹10,000', deduction: '₹175 / month', exceptions: 'Standard slab', disabled: false },
    { id: 3, from: '₹10,001', to: 'No Limit', deduction: '₹200 / month', exceptions: '₹300 deducted in February month', disabled: false }
  ];

  return (
    <RoleGuard allowedRoles={['admin']}>
    <AuthenticatedLayout>
      <Head title="System Settings" />
      
      <div className="mb-6">
        <h2 className="mt-2 text-2xl font-bold">System Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Configure default agency rules, customize professional tax (PT) slabs, and manage notification targets.</p>
      </div>

      <Card noPadding>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="enclosed" />
        
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
        </div>
      </Card>
    </AuthenticatedLayout>
    </RoleGuard>
  );
}
