/**
 * InvoiceDetailLogic.js - Logic & Helper functions for Invoice Detail Page
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

export const calculateLineItemsSummary = (lineItems = []) => {
    let totalGross = 0;
    let totalEmployerStatutory = 0;
    let totalLineCtc = 0;

    lineItems.forEach(item => {
        totalGross += parseFloat(item.gross_pay || 0);
        totalEmployerStatutory += (
            parseFloat(item.employer_pf || 0) +
            parseFloat(item.employer_esi || 0) +
            parseFloat(item.employer_lwf || 0)
        );
        totalLineCtc += parseFloat(item.gross_pay || 0) + (
            parseFloat(item.employer_pf || 0) +
            parseFloat(item.employer_esi || 0) +
            parseFloat(item.employer_lwf || 0)
        );
    });

    return {
        totalGross,
        totalEmployerStatutory,
        totalLineCtc
    };
};
