import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { User, Lock, ShieldCheck, Mail, Key, CheckCircle, AlertCircle } from 'lucide-react';

export default function Profile({ profileUser }) {
  // Profile Information Form
  const {
    data: profileData,
    setData: setProfileData,
    put: putProfile,
    processing: profileProcessing,
    errors: profileErrors,
    reset: resetProfile,
  } = useForm({
    name: profileUser?.name || '',
    email: profileUser?.email || '',
  });

  // Change Password Form
  const {
    data: passwordData,
    setData: setPasswordData,
    post: postPassword,
    processing: passwordProcessing,
    errors: passwordErrors,
    reset: resetPassword,
  } = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    putProfile(route('account.profile.update'), {
      preserveScroll: true,
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    postPassword(route('account.password.update'), {
      preserveScroll: true,
      onSuccess: () => resetPassword(),
    });
  };

  // Simple password strength calculator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '#cbd5e1' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: '#ef4444' };
    if (score === 2) return { score: 50, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score: 75, label: 'Good', color: '#3b82f6' };
    return { score: 100, label: 'Strong', color: '#22c55e' };
  };

  const strength = getPasswordStrength(passwordData.password);

  return (
    <AuthenticatedLayout>
      <Head title="My Profile & Security" />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={28} color="#2563eb" />
              My Profile & Security
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Manage your account credentials, contact information, and security preferences.
            </p>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '9999px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            fontWeight: 600,
            fontSize: '0.825rem',
            border: '1px solid #bfdbfe'
          }}>
            <ShieldCheck size={16} />
            {profileUser.role?.toUpperCase()} ACCOUNT
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem' }}>
          
          {/* Card 1: Profile Information */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <User size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Profile Details</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Update your account display name and email address.</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit}>
                {/* Full Name */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData('name', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: profileErrors.name ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {profileErrors.name && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={14} /> {profileErrors.name}
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData('email', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: profileErrors.email ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {profileErrors.email && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={14} /> {profileErrors.email}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.825rem', color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span>Account Status:</span>
                    <strong style={{ color: '#166534', textTransform: 'capitalize' }}>● {profileUser.status}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span>Email Verification:</span>
                    <strong style={{ color: '#1e3a8a' }}>{profileUser.email_verified_at}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Member Since:</span>
                    <strong>{profileUser.created_at}</strong>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={profileProcessing}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: profileProcessing ? 'not-allowed' : 'pointer',
                    opacity: profileProcessing ? 0.7 : 1,
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {profileProcessing ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Security & Password Update */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <Key size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Change Password</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Ensure your account uses a strong, unique password.</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                {/* Current Password */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData('current_password', e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: passwordErrors.current_password ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {passwordErrors.current_password && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={14} /> {passwordErrors.current_password}
                    </div>
                  )}
                </div>

                {/* New Password */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData('password', e.target.value)}
                    required
                    placeholder="Minimum 8 characters with letters & numbers"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: passwordErrors.password ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  {/* Password Strength Indicator */}
                  {passwordData.password && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ height: '4px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${strength.score}%`, backgroundColor: strength.color, transition: 'all 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600, marginTop: '0.25rem' }}>
                        Strength: {strength.label}
                      </div>
                    </div>
                  )}

                  {passwordErrors.password && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={14} /> {passwordErrors.password}
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.password_confirmation}
                    onChange={(e) => setPasswordData('password_confirmation', e.target.value)}
                    required
                    placeholder="Repeat new password"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: '8px',
                      border: passwordErrors.password_confirmation ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {passwordErrors.password_confirmation && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={14} /> {passwordErrors.password_confirmation}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={passwordProcessing}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: passwordProcessing ? 'not-allowed' : 'pointer',
                    opacity: passwordProcessing ? 0.7 : 1,
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {passwordProcessing ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
