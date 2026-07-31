import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { User, Mail, Phone, ShieldCheck, Key, Laptop, Calendar, CheckCircle, Save } from 'lucide-react';
import ChangePasswordModal from '@/Components/ChangePasswordModal';

export default function AccountProfile({ profileUser }) {
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        name: profileUser.name || '',
        email: profileUser.email || '',
        phone: profileUser.phone || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('account.profile.update'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="My Profile" />

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                {/* Header Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--primary-navy, #1F3864) 0%, #2a4b87 100%)',
                    borderRadius: '12px',
                    padding: '2rem',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                    boxShadow: '0 10px 25px -5px rgba(31, 56, 100, 0.25)',
                    marginBottom: '2rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-gold, #B8860B)',
                            color: '#FFFFFF',
                            fontSize: '2rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            border: '3px solid rgba(255,255,255,0.3)',
                        }}>
                            {profileUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF' }}>{profileUser.name}</h1>
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    color: '#FFFFFF',
                                    letterSpacing: '0.5px',
                                }}>
                                    {profileUser.role}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Mail size={14} /> {profileUser.email}
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Left Column: Editable Profile Card */}
                    <div className="card" style={{ padding: '1.75rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                            <User size={18} style={{ color: 'var(--primary-navy, #1F3864)' }} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>Personal Details</h3>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Your Full Name"
                                    style={{ width: '100%', padding: '0.6rem 0.75rem' }}
                                />
                                {errors.name && <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    placeholder="name@company.com"
                                    style={{ width: '100%', padding: '0.6rem 0.75rem' }}
                                />
                                {errors.email && <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Mobile Phone Number
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    placeholder="+91 98765 43210"
                                    style={{ width: '100%', padding: '0.6rem 0.75rem' }}
                                />
                                {errors.phone && <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '0.65rem 1.25rem',
                                    fontWeight: 600,
                                }}
                            >
                                <Save size={16} />
                                {processing ? 'Saving Changes...' : 'Save Profile Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Right Column: Account Security & Metadata Card */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card" style={{ padding: '1.75rem', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                                <ShieldCheck size={18} style={{ color: 'var(--primary-navy, #1F3864)' }} />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>Account Information</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed #F1F5F9' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle size={14} style={{ color: '#16A34A' }} /> System Status
                                    </span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 10px', borderRadius: '10px', textTransform: 'capitalize' }}>
                                        {profileUser.status || 'Active'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed #F1F5F9' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} /> Member Since
                                    </span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                        {profileUser.created_at || 'Recently'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Laptop size={14} /> Active Device Sessions
                                    </span>
                                    <a
                                        href={route('account.sessions')}
                                        style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy, #1F3864)', textDecoration: 'none' }}
                                    >
                                        Manage Sessions →
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Quick Security Actions */}
                        <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                            <h4 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>Security & Credentials</h4>
                            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748B' }}>Ensure your account credentials remain safe and up to date.</p>
                            
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="btn btn-secondary"
                                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}
                            >
                                <Key size={15} /> Update Account Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
        </AuthenticatedLayout>
    );
}
