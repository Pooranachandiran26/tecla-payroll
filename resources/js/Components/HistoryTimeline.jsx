import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Clock3, 
  Search, 
  RotateCcw, 
  X, 
  FileText,
  IndianRupee,
  Award 
} from 'lucide-react';

export default function HistoryTimeline({ revisions = [], isAdmin = false }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const isFilterActive = statusFilter !== 'all' || Boolean(fromDate) || Boolean(toDate);

  const filteredRevisions = useMemo(() => {
    if (!revisions) return [];
    return revisions.filter(item => {
      // 1. Status Filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // 2. Date Range Filter on effective_date
      if (item.effective_date) {
        const itemDateStr = String(item.effective_date).substring(0, 10);
        if (fromDate && itemDateStr < fromDate) {
          return false;
        }
        if (toDate && itemDateStr > toDate) {
          return false;
        }
      } else if (fromDate || toDate) {
        return false;
      }

      return true;
    });
  }, [revisions, statusFilter, fromDate, toDate]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '₹0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return String(dateStr).substring(0, 10);
    }
  };

  const getStatusBadge = (status, approver, approvedAt, rejectionReason) => {
    switch (status) {
      case 'approved':
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            <span className="badge badge-success" style={{ backgroundColor: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={13} color="#166534" /> Approved
            </span>
            {isAdmin && approver && (
              <span style={{ fontSize: "0.72rem", color: "#64748B" }}>
                by {approver.name || approver.email} {approvedAt ? `on ${formatDate(approvedAt)}` : ''}
              </span>
            )}
          </div>
        );
      case 'rejected':
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            <span className="badge badge-danger" style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <XCircle size={13} color="#991B1B" /> Rejected
            </span>
            {rejectionReason && (
              <span style={{ fontSize: "0.72rem", color: "#991B1B", fontStyle: "italic" }}>
                Reason: {rejectionReason}
              </span>
            )}
          </div>
        );
      case 'pending_approval':
      default:
        return (
          <span className="badge badge-warning" style={{ backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock3 size={13} color="#92400E" /> Pending Approval
          </span>
        );
    }
  };

  if (!revisions || revisions.length === 0) {
    return (
      <div style={{
        padding: "3rem 1.5rem",
        textAlign: "center",
        backgroundColor: "#F8FAFC",
        border: "1px dashed #CBD5E1",
        borderRadius: "var(--radius-md, 8px)",
        color: "var(--text-muted, #64748B)"
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
          <FileText size={40} color="#94A3B8" />
        </div>
        <h4 style={{ margin: "0 0 0.25rem 0", color: "#334155", fontSize: "1rem", fontWeight: "600" }}>No Salary Revision History</h4>
        <p style={{ margin: 0, fontSize: "0.85rem" }}>There are no recorded salary revisions for this employee yet.</p>
      </div>
    );
  }

  return (
    <div className="history-timeline-container" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Filter Controls Bar */}
      <div style={{
        padding: "1rem 1.25rem",
        backgroundColor: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: "var(--radius-md, 8px)",
        display: "flex",
        flexWrap: "wrap",
        gap: "1.25rem",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Left: Status Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#475569" }}>Status:</span>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'approved', label: 'Approved' },
              { id: 'pending_approval', label: 'Pending' },
              { id: 'rejected', label: 'Rejected' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  borderRadius: "6px",
                  border: statusFilter === tab.id ? "1px solid var(--primary-navy, #1E3A8A)" : "1px solid #CBD5E1",
                  backgroundColor: statusFilter === tab.id ? "var(--primary-navy, #1E3A8A)" : "#FFFFFF",
                  color: statusFilter === tab.id ? "#FFFFFF" : "#475569",
                  cursor: "pointer"
                }}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Date Range Pickers & Clear Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#475569" }}>From:</span>
            <input
              type="date"
              style={{
                padding: "0.35rem 0.5rem",
                fontSize: "0.8rem",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                backgroundColor: "#FFFFFF"
              }}
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#475569" }}>To:</span>
            <input
              type="date"
              style={{
                padding: "0.35rem 0.5rem",
                fontSize: "0.8rem",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                backgroundColor: "#FFFFFF"
              }}
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          {isFilterActive && (
            <button
              type="button"
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "#EF4444",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              onClick={handleClearFilters}
            >
              <X size={13} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Summary Note */}
      {isFilterActive && (
        <div style={{ fontSize: "0.82rem", color: "#64748B", marginTop: "-0.5rem" }}>
          Showing <strong>{filteredRevisions.length}</strong> of <strong>{revisions.length}</strong> recorded revisions matching your filters.
        </div>
      )}

      {/* Filtered Timeline List */}
      {filteredRevisions.length === 0 ? (
        <div style={{
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          backgroundColor: "#F8FAFC",
          border: "1px dashed #CBD5E1",
          borderRadius: "var(--radius-md, 8px)",
          color: "var(--text-muted, #64748B)"
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
            <Search size={36} color="#94A3B8" />
          </div>
          <h4 style={{ margin: "0 0 0.25rem 0", color: "#334155", fontSize: "0.95rem", fontWeight: "600" }}>No Matching Revisions Found</h4>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.83rem" }}>No salary revisions match your selected filter criteria.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClearFilters}
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.8rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        </div>
      ) : (
        <div className="history-timeline" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredRevisions.map((item, idx) => {
            const basicDiffers = parseFloat(item.old_basic_pay) !== parseFloat(item.new_basic_pay);
            const takeHomeDiffers = parseFloat(item.old_net_take_home) !== parseFloat(item.new_net_take_home);
            const ctcDiffers = parseFloat(item.old_ctc) !== parseFloat(item.new_ctc);

            return (
              <div
                key={item.id || idx}
                className="card"
                style={{
                  padding: "1.25rem",
                  border: "1px solid #E2E8F0",
                  borderRadius: "var(--radius-md, 8px)",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
              >
                {/* Card Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      backgroundColor: item.is_promotion ? "#F3E8FF" : "#EFF6FF",
                      color: item.is_promotion ? "#7E22CE" : "#1E40AF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <TrendingUp size={18} color={item.is_promotion ? "#7E22CE" : "#1E40AF"} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700", color: "#1E293B" }}>
                          Salary Revision
                        </h4>
                        {item.is_promotion && (
                          <span style={{
                            backgroundColor: "#F3E8FF",
                            color: "#6B21A8",
                            border: "1px solid #E9D5FF",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            <Award size={13} color="#6B21A8" /> Promotion
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem", color: "#64748B", marginTop: "2px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={13} color="#64748B" /> Effective: <strong>{formatDate(item.effective_date)}</strong>
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={13} color="#64748B" /> Submitted: <strong>{formatDate(item.created_at)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {getStatusBadge(item.status, item.approver, item.approved_at, item.rejection_reason)}
                </div>

                {/* Salary Breakdown Diffs */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                  backgroundColor: "#F8FAFC",
                  padding: "0.85rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid #F1F5F9"
                }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748B", fontWeight: "600" }}>Basic Pay</span>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: basicDiffers ? "#0F172A" : "#64748B", marginTop: "2px" }}>
                      <span style={{ textDecoration: basicDiffers ? "line-through" : "none", color: basicDiffers ? "#94A3B8" : "inherit" }}>
                        {formatCurrency(item.old_basic_pay)}
                      </span>
                      {basicDiffers && (
                        <span style={{ color: "#166534", marginLeft: "6px" }}>
                          → {formatCurrency(item.new_basic_pay)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748B", fontWeight: "600" }}>Net Take Home (Monthly)</span>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: takeHomeDiffers ? "#0F172A" : "#64748B", marginTop: "2px" }}>
                      <span style={{ textDecoration: takeHomeDiffers ? "line-through" : "none", color: takeHomeDiffers ? "#94A3B8" : "inherit" }}>
                        {formatCurrency(item.old_net_take_home)}
                      </span>
                      {takeHomeDiffers && (
                        <span style={{ color: "#166534", marginLeft: "6px" }}>
                          → {formatCurrency(item.new_net_take_home)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748B", fontWeight: "600" }}>CTC (Monthly)</span>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: ctcDiffers ? "#0F172A" : "#64748B", marginTop: "2px" }}>
                      <span style={{ textDecoration: ctcDiffers ? "line-through" : "none", color: ctcDiffers ? "#94A3B8" : "inherit" }}>
                        {formatCurrency(item.old_ctc)}
                      </span>
                      {ctcDiffers && (
                        <span style={{ color: "#166534", marginLeft: "6px" }}>
                          → {formatCurrency(item.new_ctc)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Designation Diff for Promotion */}
                {item.is_promotion && (item.old_designation || item.new_designation) && (
                  <div style={{
                    marginTop: "0.75rem",
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "#F3E8FF",
                    borderRadius: "6px",
                    border: "1px solid #E9D5FF",
                    fontSize: "0.83rem",
                    color: "#581C87",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <Award size={15} color="#7E22CE" />
                    <span style={{ fontWeight: "700" }}>Designation Promotion:</span>
                    <span style={{ textDecoration: "line-through", color: "#7E22CE" }}>{item.old_designation || 'Current Role'}</span>
                    <span style={{ fontWeight: "800", color: "#6B21A8" }}>→ {item.new_designation}</span>
                  </div>
                )}

                {/* Revision Reason */}
                {item.reason_for_revision && (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "#475569" }}>
                    <strong>Reason:</strong> {item.reason_for_revision}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
