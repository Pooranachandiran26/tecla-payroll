import React, { useState } from 'react';
import axios from 'axios';
import { KeyRound, Eye, EyeOff, Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setErrors({});
        setSuccessMessage('');

        if (!currentPassword) {
            setError('Please enter your current password.');
            return;
        }

        if (password.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
        }

        if (password !== passwordConfirmation) {
            setError('New password confirmation does not match.');
            return;
        }

        setLoading(true);

        axios.post(route('account.password.update'), {
            current_password: currentPassword,
            password: password,
            password_confirmation: passwordConfirmation,
        })
        .then(res => {
            setLoading(false);
            setSuccessMessage(res.data?.message || 'Password changed successfully!');
            setCurrentPassword('');
            setPassword('');
            setPasswordConfirmation('');
            setTimeout(() => {
                setSuccessMessage('');
                onClose();
            }, 1800);
        })
        .catch(err => {
            setLoading(false);
            if (err.response?.status === 422) {
                const validationErrors = err.response.data.errors || {};
                setErrors(validationErrors);
                if (err.response.data.message) {
                    setError(err.response.data.message);
                } else {
                    const firstErr = Object.values(validationErrors)[0];
                    if (firstErr) setError(Array.isArray(firstErr) ? firstErr[0] : firstErr);
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        });
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
        }}>
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    background: 'var(--primary-navy, #1F3864)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <KeyRound size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Change Password</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Update your login account password securely</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.8,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                    {error && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '6px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            color: '#991B1B',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '6px',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #86EFAC',
                            color: '#166534',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Current Password Field */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Current Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                                    borderRadius: '6px',
                                    border: errors.current_password ? '1px solid #EF4444' : '1px solid #CBD5E1',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748B',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.current_password && (
                            <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                                {errors.current_password[0]}
                            </span>
                        )}
                    </div>

                    {/* New Password Field */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min 8 chars (letters + numbers)"
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                                    borderRadius: '6px',
                                    border: errors.password ? '1px solid #EF4444' : '1px solid #CBD5E1',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748B',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.password && (
                            <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                                {errors.password[0]}
                            </span>
                        )}
                    </div>

                    {/* Confirm Password Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            value={passwordConfirmation}
                            onChange={e => setPasswordConfirmation(e.target.value)}
                            placeholder="Re-enter new password"
                            style={{
                                width: '100%',
                                padding: '0.6rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.9rem',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.55rem 1.25rem',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#475569',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.55rem 1.25rem',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'var(--primary-navy, #1F3864)',
                                color: '#FFFFFF',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: loading ? 'wait' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <Lock size={15} />
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
