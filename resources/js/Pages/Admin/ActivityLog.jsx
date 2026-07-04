import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';

export default function ActivityLog({ logs }) {
    return (
        <RoleGuard allowedRoles={['admin']}>
            <AuthenticatedLayout>
                <Head title="Activity Log" />
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-bold mb-4">System Activity Log</h1>
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.data.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {log.user ? log.user.email : 'System'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {log.action}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.target_user ? `User: ${log.target_user.email}` : ''}
                                            {log.client ? `Client: ${log.client.company_name}` : ''}
                                            {log.employee ? `Emp: ${log.employee.employee_code}` : ''}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.ip_address}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-6 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-200">
                            <div className="flex justify-between w-full">
                                {logs.prev_page_url ? (
                                    <Link href={logs.prev_page_url} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Previous</Link>
                                ) : <div></div>}
                                {logs.next_page_url ? (
                                    <Link href={logs.next_page_url} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Next</Link>
                                ) : <div></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </RoleGuard>
    );
}
