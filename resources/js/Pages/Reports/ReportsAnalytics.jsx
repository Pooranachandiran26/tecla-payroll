import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Card from '../../Components/ui/Card';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function ReportsAnalytics() {
  const role = 'admin'; // Or from context/props

  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
    <AuthenticatedLayout>
      <Head title="Reports & Analytics" />
      
      <div className="mb-6">
        <h2 className="mt-2 text-2xl font-bold">Reports & Payroll Analytics</h2>
        <p className="text-gray-500 text-sm mt-1">Visual overview of agency margins, billing values, and statutory submission status.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        
        {/* Revenue Chart */}
        {role === 'manager' ? (
          <div className="card locked-card" style={{ padding: 0, border: 'none' }}>
            <div className="locked-blur p-6 bg-white border border-gray-200 rounded-md">
              <h3 className="text-lg font-bold text-blue-900">Monthly Revenue per Client (June 2026)</h3>
              <p className="text-xs text-gray-500 mb-4">Pass-through gross payroll billing base (Total: ₹42.5 Lakhs)</p>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-blue-900 font-semibold">Mahindra Corp</div>
                  <div className="flex-1 bg-gray-100 h-4 rounded overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: '85%' }}></div>
                  </div>
                  <div className="w-16 text-right text-sm font-bold">₹34.8L</div>
                </div>
              </div>
            </div>
            <div className="locked-overlay flex flex-col items-center justify-center">
              <div className="locked-badge">🔒 Margin Lock</div>
              <span className="text-sm font-bold text-gray-900 text-center">Billing Charts Protected</span>
              <span className="text-xs text-gray-500 text-center mt-1">Billing and margin analysis metrics are restricted to Administrator roles.</span>
            </div>
          </div>
        ) : (
          <Card>
            <h3 className="text-lg font-bold text-blue-900">Monthly Revenue per Client (June 2026)</h3>
            <p className="text-xs text-gray-500 mb-4">Pass-through gross payroll billing base (Total: ₹42.5 Lakhs)</p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-blue-900 font-semibold text-right">Mahindra Corp</div>
                <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-700">₹34.8L</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-blue-900 font-semibold text-right">Reliance Digital</div>
                <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: '45%' }}></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-700">₹5.2L</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm text-blue-900 font-semibold text-right">Tata Consultancy</div>
                <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '25%' }}></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-700">₹2.5L</div>
              </div>
            </div>
          </Card>
        )}

        {/* Margin Chart */}
        {role === 'manager' ? (
          <div className="card locked-card" style={{ padding: 0, border: 'none' }}>
            <div className="locked-blur p-6 bg-white border border-gray-200 rounded-md">
              <h3 className="text-lg font-bold text-blue-900">Agency Net Profit Margins (H1 2026)</h3>
              <p className="text-xs text-gray-500 mb-4">Accumulated commission margins (Average: 8.5%)</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-sm text-blue-900 font-semibold">Jan 2026</div>
                  <div className="flex-1 bg-gray-100 h-4 rounded overflow-hidden">
                    <div className="bg-green-600 h-full" style={{ width: '60%' }}></div>
                  </div>
                  <div className="w-16 text-right text-sm font-bold">₹3.8L</div>
                </div>
              </div>
            </div>
            <div className="locked-overlay flex flex-col items-center justify-center">
              <div className="locked-badge">🔒 Margin Lock</div>
              <span className="text-sm font-bold text-gray-900 text-center">Margin Data Protected</span>
              <span className="text-xs text-gray-500 text-center mt-1">Margins and agency profits analysis metrics are restricted to Administrator roles.</span>
            </div>
          </div>
        ) : (
          <Card>
            <h3 className="text-lg font-bold text-blue-900">Agency Net Profit Margins (H1 2026)</h3>
            <p className="text-xs text-gray-500 mb-4">Accumulated commission margins (Average: 8.5%)</p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-blue-900 font-semibold text-right">Jan 2026</div>
                <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-700">₹3.8L</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-blue-900 font-semibold text-right">Feb 2026</div>
                <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: '65%' }}></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-700">₹4.1L</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-blue-900 font-semibold text-right">Mar 2026</div>
                <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: '70%' }}></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-700">₹4.5L</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-blue-900 font-semibold text-right">Apr 2026</div>
                <div className="flex-1 bg-gray-100 h-5 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: '75%' }}></div>
                </div>
                <div className="w-16 text-right text-sm font-bold text-gray-900">₹5.1L</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card>
        <h3 className="text-lg font-bold text-blue-900">Statutory Filings Compliance Summary</h3>
        <p className="text-xs text-gray-500 mb-6">Filing compliance rate across active ECR codes (Target: 100% On-time)</p>
        
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="bg-green-50 p-6 rounded-md">
            <div className="text-4xl font-bold text-green-600">100%</div>
            <strong className="text-sm text-gray-900 block mt-2">Provident Fund filings</strong>
            <span className="text-xs text-gray-500">Q1 ECR uploads verified</span>
          </div>
          <div className="bg-green-50 p-6 rounded-md">
            <div className="text-4xl font-bold text-green-600">100%</div>
            <strong className="text-sm text-gray-900 block mt-2">ESI Challan returns</strong>
            <span className="text-xs text-gray-500">Biometric coverage validated</span>
          </div>
          <div className="bg-amber-50 p-6 rounded-md">
            <div className="text-4xl font-bold text-amber-500">94.2%</div>
            <strong className="text-sm text-gray-900 block mt-2">Quarterly TDS Submissions</strong>
            <span className="text-xs text-gray-500">Annexure-II revisions pending</span>
          </div>
        </div>
      </Card>

    </AuthenticatedLayout>
    </RoleGuard>
  );
}
