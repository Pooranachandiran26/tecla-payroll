export const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN')}`;

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const maskAccountNumber = (acc) =>
  '●'.repeat(acc.length - 4) + acc.slice(-4);

export const getInitials = (name) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const classNames = (...classes) =>
  classes.filter(Boolean).join(' ');
