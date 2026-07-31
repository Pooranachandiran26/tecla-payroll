/**
 * PayslipLogic.js - Logic & helpers for Employee Payslips Center
 */

export const getMonthOptions = () => {
    const options = [];
    const startDate = new Date(2026, 4, 1);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const monthNum = String(currentDate.getMonth() + 1).padStart(2, '0');
        const label = currentDate.toLocaleString('default', { month: 'long' }) + ' ' + year;
        options.push({ value: `${year}-${monthNum}-01`, label });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return options.reverse();
};

export const formatRupee = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    return '₹' + Math.round(parseFloat(amount)).toLocaleString('en-IN');
};

export const filterEmployees = (employees = [], searchQuery = '') => {
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(emp =>
        (emp.full_name || '').toLowerCase().includes(q) ||
        (emp.employee_code || '').toLowerCase().includes(q)
    );
};

export const resolveAccentColor = (selectedItem, clientBranding) => {
    let accentColor = "#1F3864";
    if (selectedItem?.employment_model === 'eor' && clientBranding?.accent_color) {
        accentColor = clientBranding.accent_color;
    }
    return accentColor;
};
