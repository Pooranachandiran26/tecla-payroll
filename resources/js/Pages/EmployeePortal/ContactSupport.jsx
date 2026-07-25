import React, { useState } from 'react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { MessageSquare, Send, HelpCircle, CheckCircle, Clock } from 'lucide-react';
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full"><Clock className="w-3 h-3" /> In Progress</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Contact Support & Raise Query" />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1F3864]">Contact Support & Raise a Query</h1>
          <p className="text-gray-500 text-sm">Have a question regarding your payroll, attendance, leave, or benefits? Submit your query below and our HR & Admin team will respond promptly.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submit Query Form */}
          <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <MessageSquare className="w-5 h-5 text-[#1F3864]" />
              <h2 className="font-bold text-base text-[#1F3864]">Submit New Query</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">Category</label>
                <select
                  value={data.category}
                  onChange={(e) => setData('category', e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
                >
                  <option value="payroll">Payroll & Payslips</option>
                  <option value="attendance">Attendance & Punches</option>
                  <option value="leave">Leave & Holidays</option>
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
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
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
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-[#1F3864] focus:ring-[#1F3864]"
                />
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
              </div>

              <Button type="submit" variant="primary" loading={processing} className="w-full flex justify-center items-center gap-2">
                <Send className="w-4 h-4" /> Submit Support Query
              </Button>
            </form>
          </div>

          {/* Submitted Queries History */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#1F3864]" />
                <h2 className="font-bold text-base text-[#1F3864]">Your Query History</h2>
              </div>
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-semibold">
                {queries.length} Total Queries
              </span>
            </div>

            {queries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">You haven't submitted any queries yet.</p>
                <p className="text-xs mt-1">Use the form on the left to reach out to HR and Support.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queries.map((q) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-white transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-700 px-2 py-0.5 rounded mr-2">
                          {q.category}
                        </span>
                        <h3 className="inline font-semibold text-sm text-gray-900">{q.subject}</h3>
                      </div>
                      <div>{getStatusBadge(q.status)}</div>
                    </div>

                    <p className="text-xs text-gray-600 mb-3 whitespace-pre-line leading-relaxed bg-white p-3 rounded border border-gray-100">
                      {q.message}
                    </p>

                    {q.admin_response ? (
                      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r text-xs text-emerald-900 mt-2">
                        <div className="font-bold mb-1 flex items-center gap-1 text-emerald-800">
                          <span>💬 Support Response</span>
                          {q.resolver && <span className="font-normal text-[11px] text-emerald-700">(by {q.resolver.name})</span>}
                        </div>
                        <p className="whitespace-pre-line">{q.admin_response}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">Submitted on {new Date(q.created_at).toLocaleDateString()} — Awaiting response from HR.</p>
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
