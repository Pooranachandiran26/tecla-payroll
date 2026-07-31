/**
 * InvoicesListLogic.js - Logic & helper functions for Invoices Registry
 */

export const formatRupee = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
    const num = parseFloat(amount);
    return '₹' + num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(d.getDate()).padStart(2, '0')} ${mNames[d.getMonth()]} ${d.getFullYear()}`;
};

export const getStatusBadgeType = (status) => {
    switch (status) {
        case 'draft': return 'warning';
        case 'finalized': return 'info';
        case 'raised':
        case 'sent': return 'active';
        case 'paid': return 'success';
        case 'overdue': return 'danger';
        default: return 'neutral';
    }
};

export const getStatusLabel = (status) => {
    if (!status) return '—';
    return status.charAt(0).toUpperCase() + status.slice(1);
};

export const calculateSummaryStats = (invoicesData = []) => {
    let totalCount = invoicesData.length;
    let draftCount = 0;
    let totalPassthrough = 0;
    let totalAgencyFee = 0;
    let totalGst = 0;
    let grandTotal = 0;

    invoicesData.forEach(inv => {
        if (inv.status === 'draft') draftCount++;
        totalPassthrough += parseFloat(inv.gross_salary_passthrough || 0);
        totalAgencyFee += parseFloat(inv.agency_service_fee || 0);
        totalGst += parseFloat(inv.gst_amount || 0);
        grandTotal += parseFloat(inv.grand_total || 0);
    });

    return {
        totalCount,
        draftCount,
        totalPassthrough,
        totalAgencyFee,
        totalGst,
        grandTotal
    };
};
