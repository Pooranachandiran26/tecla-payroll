import React, { useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

import RoleGuard from '../../Components/RoleGuard.jsx';
export default function PayrollProcessing() {
    const containerRef = useRef(null);
    const cleanupRef = useRef([]);

    useEffect(() => {
        let cancelled = false;

        async function loadLegacyPage() {
            // 1. Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/legacy/payroll-processing.css';
            document.head.appendChild(link);
            cleanupRef.current.push(() => link.remove());

            // 2. Load HTML
            try {
                const htmlRes = await fetch('/legacy/payroll-processing.html');
                const htmlText = await htmlRes.text();
                if (cancelled) return;
                if (containerRef.current) {
                    containerRef.current.innerHTML = htmlText;
                }
            } catch (err) {
                console.error('Failed to load legacy HTML:', err);
                return;
            }

            // 3. Load and execute JS
            try {
                const jsRes = await fetch('/legacy/payroll-processing.js');
                const jsText = await jsRes.text();
                if (cancelled) return;
                const script = document.createElement('script');
                script.textContent = jsText;
                document.body.appendChild(script);
                cleanupRef.current.push(() => script.remove());
            } catch (err) {
                console.error('Failed to load legacy JS:', err);
            }
        }

        loadLegacyPage();

        return () => {
            cancelled = true;
            cleanupRef.current.forEach(fn => fn());
            cleanupRef.current = [];
        };
    }, []);

    return (
        <RoleGuard allowedRoles={['admin', 'executive']}>
    <AuthenticatedLayout>
            <Head title="Payroll Processing" />
            <div ref={containerRef} />
        </AuthenticatedLayout>
    </RoleGuard>
    );
}
