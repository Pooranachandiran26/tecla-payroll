import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
import ComingSoonFeature from '../../Components/ui/ComingSoonFeature';

export default function EmployeePayslips() {
    return (
        <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
    <AuthenticatedLayout>
            <Head title="Employee Payslips" />
            
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>My Salary Payslips</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View history of payroll distributions and download detailed PDF tax receipts.</p>
      </div>

      <ComingSoonFeature 
        title="Payslips"
        description="Payslips are generated once your employer processes monthly payroll."
        dependsOn={["Payroll Module"]}
      />
    
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
