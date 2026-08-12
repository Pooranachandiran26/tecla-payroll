import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import RoleGuard from '../../../Components/RoleGuard.jsx';
import Card from '../../../Components/ui/Card';
import Badge from '../../../Components/ui/Badge';
import { FileText, ArrowRight, Lock } from 'lucide-react';

export default function ReportsIndex({ catalog = [] }) {
  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="reports">
      <AuthenticatedLayout>
        <Head title="Reports Catalog" />

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Executive Reports & Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">
            Access verified payroll registers, statutory deduction summary, invoice billing registers, and CTC cost breakdown reports.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {catalog.map((group, idx) => (
            <div key={idx}>
              <h3 className="text-lg font-bold text-blue-900 mb-4 border-b pb-2">{group.category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.reports.map((report) => (
                  <Card key={report.key} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant={report.available ? 'success' : 'neutral'}>
                          {report.badge}
                        </Badge>
                        {!report.available && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Lock size={12} /> Queued
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-blue-950 text-base mb-2">{report.title}</h4>
                      <p className="text-gray-600 text-xs leading-relaxed mb-4">{report.description}</p>
                    </div>

                    <div>
                      {report.available ? (
                        <Link
                          href={route('admin.reports.show', report.key)}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          <FileText size={16} /> Open Interactive Report <ArrowRight size={14} />
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium italic">
                          Available in upcoming release
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
