import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';
import { 
    ShieldAlert, 
    FileQuestion, 
    AlertTriangle, 
    ArrowLeft, 
    Home 
} from 'lucide-react';

function ErrorContent({ status, message }) {
    const getStatusConfig = () => {
        switch (status) {
            case 403:
                return {
                    title: '403 | Access Restricted',
                    subtitle: message || 'You do not have permission or role clearance to access this module.',
                    icon: <ShieldAlert size={44} style={{ color: '#D97706', display: 'block' }} />,
                    iconBg: '#FEF3C7',
                    iconBorder: '#FCD34D'
                };
            case 404:
                return {
                    title: '404 | Page Not Found',
                    subtitle: 'The page or resource you are looking for does not exist or has been moved.',
                    icon: <FileQuestion size={44} style={{ color: '#2563EB', display: 'block' }} />,
                    iconBg: '#EFF6FF',
                    iconBorder: '#93C5FD'
                };
            case 500:
            case 503:
            default:
                return {
                    title: `${status || 500} | System Error`,
                    subtitle: 'An unexpected server error occurred while processing your request.',
                    icon: <AlertTriangle size={44} style={{ color: '#DC2626', display: 'block' }} />,
                    iconBg: '#FEE2E2',
                    iconBorder: '#FCA5A5'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div style={{
            width: '100%',
            minHeight: 'calc(100vh - 220px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justify: 'center',
            padding: '2rem 1rem',
            boxSizing: 'border-box'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '3rem 2.25rem',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                margin: 'auto'
            }}>
                {/* Title - Centered */}
                <h1 style={{
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: 'var(--primary-navy, #1F3864)',
                    margin: '0 0 0.65rem 0',
                    textAlign: 'center',
                    width: '100%',
                    letterSpacing: '-0.01em'
                }}>
                    {config.title}
                </h1>

                {/* Subtitle / Description - Centered */}
                <p style={{
                    fontSize: '0.92rem',
                    color: '#64748B',
                    lineHeight: '1.6',
                    margin: '0 0 2rem 0',
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: '380px'
                }}>
                    {config.subtitle}
                </p>

                {/* Action Buttons - Perfectly Centered Row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    gap: '0.85rem',
                    width: '100%',
                    flexWrap: 'wrap'
                }}>
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="btn btn-secondary"
                        style={{
                            padding: '0.6rem 1.35rem',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justify: 'center',
                            gap: '6px',
                            borderRadius: '8px'
                        }}
                    >
                        <ArrowLeft size={16} /> Go Back
                    </button>

                    <Link
                        href={route('dashboard')}
                        className="btn btn-navy"
                        style={{
                            padding: '0.6rem 1.35rem',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justify: 'center',
                            gap: '6px',
                            borderRadius: '8px'
                        }}
                    >
                        <Home size={16} /> Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function Error({ status, message }) {
    const { auth } = usePage().props;

    if (auth?.user) {
        return (
            <AuthenticatedLayout hideSubNav={true}>
                <Head title={`${status} Error - Tecla Payroll`} />
                <ErrorContent status={status} message={message} />
            </AuthenticatedLayout>
        );
    }

    return (
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            <Head title={`${status} Error - Tecla Payroll`} />
            <header style={{
                backgroundColor: 'var(--primary-navy, #1F3864)',
                color: '#ffffff',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between'
            }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                    ▲ TECLA PAYROLL
                </div>
                <Link href={route('login')} style={{ color: '#ffffff', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'underline' }}>
                    Sign In
                </Link>
            </header>
            <ErrorContent status={status} message={message} />
        </div>
    );
}
