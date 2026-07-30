import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import RoleGuard from '../../Components/RoleGuard.jsx';
import Button from '../../Components/ui/Button';
import Badge from '../../Components/ui/Badge';
import useToast from '../../Hooks/useToast.jsx';

export default function ContactSupport({ queries = [] }) {
  const { showToast } = useToast();

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialCategory = urlParams.get('category') || 'general';

  const { data, setData, post, processing, errors, reset } = useForm({
    subject: '',
    category: initialCategory,
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.subject.trim() || !data.message.trim()) return;

    post(route('employee.contact.store'), {
      onSuccess: () => {
        showToast({ message: 'Support query submitted successfully.', type: 'success' });
        reset();
      },
      onError: (errs) => {
        const flashError = usePage().props.flash?.error;
        if (flashError) {
          showToast({ message: flashError, type: 'error' });
        } else {
          showToast({ message: 'Validation failed. Please check form inputs.', type: 'error' });
        }
      }
    });
  };

  const getCategoryBadgeVariant = (category) => {
    switch (category) {
      case 'payroll': return 'info';
      case 'attendance': return 'warning';
      case 'leave': return 'neutral';
      case 'benefits': return 'success';
      default: return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'employee']}>
      <AuthenticatedLayout>
        <Head title="Contact Support & Raise Query" />

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1F3864]">Contact Support &amp; Raise a Query</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Have a question regarding your payroll, attendance, leave, or benefits? Submit your query below and our HR &amp; Admin team will respond promptly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submit Query Form Card */}
          <div className="card">
            <h3 className="card-title mb-4">Submit New Query</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Category</label>
                <select
                  value={data.category}
                  onChange={(e) => setData('category', e.target.value)}
                  className="form-control w-full text-sm"
                >
                  <option value="payroll">Payroll &amp; Payslips</option>
                  <option value="attendance">Attendance &amp; Punches</option>
                  <option value="leave">Leave &amp; Holidays</option>
                  <option value="benefits">Statutory Benefits (PF/ESI/TDS)</option>
                  <option value="general">General HR Inquiry</option>
                </select>
                {errors.category && <span className="error-text">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Brief summary of your question"
                  value={data.subject}
                  onChange={(e) => setData('subject', e.target.value)}
                  className="form-control w-full text-sm"
                />
                {errors.subject && <span className="error-text">{errors.subject}</span>}
              </div>

              <div className="form-group">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Detailed Message</label>
                <textarea
                  rows={5}
                  placeholder="Describe your issue or question in detail..."
                  value={data.message}
                  onChange={(e) => setData('message', e.target.value)}
                  className="form-control w-full text-sm"
                />
                {errors.message && <span className="error-text">{errors.message}</span>}
              </div>

              <Button type="submit" variant="primary" loading={processing} className="w-full justify-center">
                Submit Support Query
              </Button>
            </form>
          </div>

          {/* Submitted Queries History Card */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="card-title">My Support Query History</h3>
              <Badge variant="neutral">
                {queries.length} {queries.length === 1 ? 'Query' : 'Queries'}
              </Badge>
            </div>

            {queries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm font-medium">You haven't submitted any queries yet.</p>
                <p className="text-xs mt-1">Use the form on the left to submit a query to HR &amp; Support.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queries.map((q) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-white transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getCategoryBadgeVariant(q.category)}>
                          {q.category.toUpperCase()}
                        </Badge>
                        <h4 className="font-semibold text-sm text-gray-900">{q.subject}</h4>
                      </div>
                      <div>
                        <Badge variant={getStatusBadgeVariant(q.status)}>
                          {q.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded border border-gray-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed mb-3">
                      {q.message}
                    </div>

                    {q.admin_response ? (
                      <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r text-xs text-green-900 mt-2">
                        <div className="font-bold mb-1 flex items-center justify-between text-green-800">
                          <span>💬 Support Response {q.resolver ? `(by ${q.resolver.name})` : ''}</span>
                          {q.resolved_at && (
                            <span className="text-[10px] font-normal text-green-700">
                              {new Date(q.resolved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line">{q.admin_response}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">
                        Submitted on {new Date(q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — Awaiting response from HR.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
