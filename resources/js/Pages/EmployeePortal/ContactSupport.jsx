import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { MessageSquare, Send, HelpCircle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import Button from '../../Components/ui/Button';

export default function ContactSupport({ queries = [] }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    subject: '',
    category: 'general',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('employee.contact.store'), {
      onSuccess: () => {
        reset();
      },
    });
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'payroll':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'attendance':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'leave':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'benefits':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Pending Response
          </span>
        );
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Contact Support & Raise Query" />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Contact Support &amp; Raise a Query</h1>
          <p className="text-gray-500 text-sm mt-1">
            Have a question regarding your payroll, attendance, leave, or benefits? Submit your query below and our HR &amp; Admin team will respond promptly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Submit Query Form (Left Column) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
              <MessageSquare className="w-5 h-5 text-[#1F3864]" />
              <h2 className="font-bold text-base text-[#1F3864]">Submit New Query</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Category</label>
                <select
                  value={data.category}
                  onChange={(e) => setData('category', e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
                >
                  <option value="payroll">Payroll &amp; Payslips</option>
                  <option value="attendance">Attendance &amp; Punches</option>
                  <option value="leave">Leave &amp; Holidays</option>
                  <option value="benefits">Statutory Benefits (PF/ESI/TDS)</option>
                  <option value="general">General HR Inquiry</option>
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  placeholder="Brief summary of your question"
                  value={data.subject}
                  onChange={(e) => setData('subject', e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
                />
                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Detailed Message</label>
                <textarea
                  rows={5}
                  placeholder="Describe your issue or question in detail..."
                  value={data.message}
                  onChange={(e) => setData('message', e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
                />
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
              </div>

              <Button type="submit" variant="navy" loading={processing} className="w-full justify-center gap-2 py-2.5 font-bold">
                <Send className="w-4 h-4" /> Submit Support Query
              </Button>
            </form>
          </div>

          {/* Submitted Queries History (Right Column) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#1F3864]" />
                <h2 className="font-bold text-base text-[#1F3864]">Your Query History</h2>
              </div>
              <span className="text-xs bg-slate-100 text-[#1F3864] border border-slate-200 px-3 py-1 rounded-full font-bold">
                {queries.length} {queries.length === 1 ? 'Query' : 'Queries'}
              </span>
            </div>

            {queries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#1F3864]" />
                <p className="text-sm font-medium text-gray-700">You haven't submitted any queries yet.</p>
                <p className="text-xs text-gray-400 mt-1">Use the form on the left to submit a query to HR &amp; Support.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {queries.map((q) => (
                  <div key={q.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-xs hover:border-[#1F3864]/30 transition-all">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${getCategoryBadgeClass(q.category)}`}>
                          {q.category}
                        </span>
                        <h3 className="font-bold text-sm text-gray-900">{q.subject}</h3>
                      </div>
                      <div>{getStatusBadge(q.status)}</div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed mb-3">
                      {q.message}
                    </div>

                    {q.admin_response ? (
                      <div className="bg-emerald-50/90 border-l-4 border-emerald-500 p-4 rounded-r-lg text-xs text-emerald-950 mt-3">
                        <div className="font-bold mb-1.5 flex items-center justify-between text-emerald-800 border-b border-emerald-200/60 pb-1.5">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Support Response</span>
                            {q.resolver && <span className="font-normal text-[11px] text-emerald-700">(by {q.resolver.name})</span>}
                          </span>
                          {q.resolved_at && (
                            <span className="text-[10px] font-medium text-emerald-700">
                              {new Date(q.resolved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line text-emerald-900 leading-relaxed font-normal mt-2">{q.admin_response}</p>
                      </div>
                    ) : (
                      <div className="bg-amber-50/70 border-l-4 border-amber-400 p-3 rounded-r-lg text-xs text-amber-900 mt-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Submitted on {new Date(q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — Awaiting response from HR.</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
