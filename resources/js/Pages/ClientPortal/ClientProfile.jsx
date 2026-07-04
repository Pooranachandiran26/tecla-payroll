import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ClientProfile({ auth, client }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Client Profile</h2>}
        >
            <Head title="Client Profile" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <h3 className="text-lg font-bold mb-4">Company Information</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Company Name</p>
                                    <p className="font-medium">{client.company_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Client Code</p>
                                    <p className="font-medium">{client.client_code}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Industry</p>
                                    <p className="font-medium">{client.industry || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Primary Contact</p>
                                    <p className="font-medium">{client.primary_poc_name}</p>
                                    <p className="text-sm text-gray-600">{client.primary_poc_email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Location</p>
                                    <p className="font-medium">{client.registered_city}, {client.registered_state}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <p className="font-medium capitalize">{client.status}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
