// ═══════════════════════════════════════════════════
//  CLIENT FORM — Shared Constants & Data
// ═══════════════════════════════════════════════════

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi (NCT)', 'Chandigarh'
];

export const COMPANY_TYPES = [
  { value: 'pvt_ltd', label: 'Private Limited (Pvt. Ltd.)' },
  { value: 'pub_ltd', label: 'Public Limited (Ltd.)' },
  { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
  { value: 'opc', label: 'One Person Company (OPC)' },
  { value: 'partnership', label: 'Partnership Firm' },
  { value: 'proprietorship', label: 'Sole Proprietorship' },
  { value: 'trust', label: 'Trust / Society / NGO' },
  { value: 'govt', label: 'Government / PSU' },
];

export const INDUSTRIES = [
  'Information Technology (IT)',
  'Banking, Financial Services & Insurance (BFSI)',
  'Manufacturing',
  'Healthcare & Pharmaceuticals',
  'Retail & E-Commerce',
  'Real Estate & Construction',
  'Logistics & Supply Chain',
  'Education & EdTech',
  'Automobile',
  'FMCG',
  'Telecom',
  'Other',
];

export const CONTRACT_TYPES = [
  { value: 'agency', label: 'Agency Payroll (Staffing Model)' },
  { value: 'eor', label: 'Employer of Record (EOR / Pass-through)' },
  { value: 'hybrid', label: 'Hybrid (Agency + EOR)' },
  { value: 'consulting', label: 'Consulting / Project Based' },
];

export const BILLING_MODELS = [
  { value: 'markup', label: 'CTC + Markup Percentage (%)' },
  { value: 'fixed_per_candidate', label: 'Fixed Fee Per Candidate (₹/candidate)' },
  { value: 'fixed_per_month', label: 'Fixed Monthly Retainer (₹/month)' },
  { value: 'lumpsum', label: 'Lump Sum Project Billing' },
  { value: 'hourly', label: 'Hourly Rate Billing' },
];

export const OT_BILLING_RULES = [
  { value: 'not_applicable', label: 'Not Applicable (No OT Billed)' },
  { value: 'standard', label: 'Standard Rate (1.0x hourly rate)' },
  { value: '1_5x', label: '1.5x Hourly Rate' },
  { value: 'double', label: 'Double Time (2.0x hourly rate)' },
];

export const PAYMENT_NET_TERMS = [
  { value: 'immediate', label: 'Due on Receipt (Immediate)' },
  { value: 'net7', label: 'Net 7 Days' },
  { value: 'net15', label: 'Net 15 Days' },
  { value: 'net30', label: 'Net 30 Days' },
  { value: 'net45', label: 'Net 45 Days' },
  { value: 'net60', label: 'Net 60 Days' },
];

export const INVOICE_CYCLES = [
  { value: 'monthly', label: 'Monthly (Last working day of month)' },
  { value: 'biweekly', label: 'Bi-Weekly (Every 2 weeks)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
];

export const CURRENCIES = [
  { value: 'INR', label: '₹ INR (Indian Rupee)' },
  { value: 'USD', label: '$ USD (US Dollar)' },
  { value: 'EUR', label: '€ EUR (Euro)' },
  { value: 'GBP', label: '£ GBP (British Pound)' },
  { value: 'SGD', label: 'S$ SGD (Singapore Dollar)' },
  { value: 'AED', label: 'AED (UAE Dirham)' },
];

export const COUNTRIES = [
  { value: 'India', label: 'India' },
  { value: 'USA', label: 'USA' },
  { value: 'UAE', label: 'UAE' },
  { value: 'UK', label: 'UK' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Other', label: 'Other' },
];

export const GST_STATE_CODES = {
  'Tamil Nadu': '33', 'Maharashtra': '27', 'Karnataka': '29',
  'Delhi (NCT)': '07', 'Telangana': '36', 'Gujarat': '24',
  'West Bengal': '19', 'Rajasthan': '08', 'Uttar Pradesh': '09',
  'Andhra Pradesh': '37', 'Bihar': '10', 'Chhattisgarh': '22',
  'Goa': '30', 'Haryana': '06', 'Himachal Pradesh': '02',
  'Jharkhand': '20', 'Kerala': '32', 'Madhya Pradesh': '23',
  'Manipur': '14', 'Meghalaya': '17', 'Mizoram': '15',
  'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
  'Sikkim': '11', 'Tripura': '16', 'Uttarakhand': '05',
  'Arunachal Pradesh': '12', 'Assam': '18', 'Chandigarh': '04'
};

export const PIN_MAPPING = {
  '400018': { city: 'Mumbai', state: 'Maharashtra' },
  '400001': { city: 'Mumbai', state: 'Maharashtra' },
  '560001': { city: 'Bengaluru', state: 'Karnataka' },
  '600001': { city: 'Chennai', state: 'Tamil Nadu' },
  '110001': { city: 'New Delhi', state: 'Delhi (NCT)' },
  '500001': { city: 'Hyderabad', state: 'Telangana' },
  '380001': { city: 'Ahmedabad', state: 'Gujarat' },
};

export const DOC_TYPE_LABELS = {
  'agent_client_agreement': 'Agent & Client Agreement',
  'msa': 'Master Service Agreement',
  'nda': 'NDA',
  'work_order': 'Work Order',
  'gst_cert': 'GST Certificate',
  'pan_card': 'PAN Card',
  'tan_doc': 'TAN Allotment Letter',
  'other': 'Other Document',
};

export const DOC_TYPE_ICONS = {
  'agent_client_agreement': '🤝',
  'msa': '📜',
  'nda': '🔒',
  'work_order': '📋',
  'gst_cert': '🏛️',
  'pan_card': '💳',
  'tan_doc': '📄',
  'other': '📎',
};

export const REQUIRED_DOC_TYPES = [
  'agent_client_agreement', 'msa', 'pan_card', 'gst_cert', 'work_order', 'nda', 'tan_doc'
];

export const ALLOWED_FILE_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_STATUS_TRANSITIONS = {
  'draft': ['onboarding'],
  'onboarding': ['active'],
  'active': ['suspended', 'inactive'],
  'suspended': ['active'],
  'inactive': ['active'],
};

export const ACCOUNT_MANAGERS = [
  { value: 'sunita', label: 'Sunita Verma' },
  { value: 'rahul', label: 'Rahul Desai' },
  { value: 'priya', label: 'Priya Kapoor' },
  { value: 'amit', label: 'Amit Singh' },
];

export const PT_STATES = [
  { value: 'auto', label: 'Auto (from location)' },
  { value: 'MH', label: 'Maharashtra' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'WB', label: 'West Bengal' },
  { value: 'TN', label: 'Tamil Nadu' },
  { value: 'AP', label: 'Andhra Pradesh' },
  { value: 'TS', label: 'Telangana' },
  { value: 'NA', label: 'Not Applicable' },
];

export const STATE_REG_OPTIONS = [
  { value: 'MH', label: 'Maharashtra' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'DL', label: 'Delhi' },
  { value: 'TN', label: 'Tamil Nadu' },
  { value: 'TS', label: 'Telangana' },
  { value: 'WB', label: 'West Bengal' },
];

export const CUTOFF_DAYS = [
  { value: '25', label: '25th of month' },
  { value: '26', label: '26th of month' },
  { value: '27', label: '27th of month' },
  { value: '28', label: '28th of month' },
  { value: 'eom', label: 'Last day of month' },
];

export const PAYROLL_LOCK_DAYS = [
  { value: '1', label: '1st of next month' },
  { value: '2', label: '2nd of next month' },
  { value: '3', label: '3rd of next month' },
  { value: '4', label: '4th of next month' },
  { value: '5', label: '5th of next month' },
];

export const SALARY_CREDIT_DAYS = [
  { value: '1', label: '1st of month' },
  { value: '5', label: '5th of month' },
  { value: '7', label: '7th of month' },
  { value: '10', label: '10th of month' },
  { value: 'eom', label: 'Last working day' },
];

export const INVOICE_RAISE_DAYS = [
  { value: 'Same as Payroll Lock Day', label: 'Same as Payroll Lock Day' },
  { value: '+1 Day', label: '+1 Day' },
  { value: '+2 Days', label: '+2 Days' },
  { value: '+3 Days', label: '+3 Days' },
];

export const PAYROLL_CONVENTIONS = [
  { value: 'calendar', label: 'Calendar Month (1st–last day)' },
  { value: 'custom', label: 'Custom Cycle' },
];

// Regex patterns for validation
export const PATTERNS = {
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  TAN: /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PIN: /^[1-9][0-9]{5}$/,
};

// Wizard step labels
export const WIZARD_STEPS = [
  { num: 1, label: '① Identity' },
  { num: 2, label: '② Address' },
  { num: 3, label: '③ Contacts' },
  { num: 4, label: '④ Contract' },
  { num: 5, label: '⑤ Statutory' },
  { num: 6, label: '⑥ Documents' },
  { num: 7, label: '⑦ Portal' },
  { num: 8, label: '⑧ SLA' },
];

// Default form data initializer
export function getDefaultFormData() {
  return {
    // Identity
    companyName: '', companyType: '', trustRegNo: '',
    gstin: '', gstType: 'regular', pan: '', tan: '', cin: '',
    incorporationDate: '', clientCode: '', industry: '', subIndustry: '',
    clientStatus: 'onboarding', workLocationsCount: 1,
    isGroupCompany: false, parentCompany: '',

    // Address
    regAddressLine1: '', regAddressLine2: '', regCity: '', regState: 'Maharashtra',
    regPin: '', country: 'India', taxId: '', regNo: '',
    billingSame: true, billAddressLine1: '', billCity: '', billState: '', billPin: '',
    hasAgencyBranches: false,

    // Contacts
    poc1: { name: '', designation: '', email: '', phone: '', whatsappSame: true, prefs: { email: true, sms: true, wa: true } },
    poc2: { name: '', designation: '', email: '', phone: '', whatsappSame: true, ccInvoice: true, prefs: { email: true, sms: false, wa: false } },
    poc3: { name: '', email: '', whatsappSame: true, onboardingKits: true, prefs: { email: true, sms: false, wa: false } },

    // Contract & Billing
    contractType: '', billingModel: '',
    markupPct: '', markupBase: 'gross',
    fixedFeeCandidate: '', fixedMonthlyRetainer: '',
    hourlyRate: '', standardHours: '',
    otBilling: 'not_applicable', otApproval: 'timesheet',
    invoiceCycle: 'monthly', paymentTerms: 'net15',
    contractStart: '', contractEnd: '',
    autoRenewal: false, poRequired: false, poNumber: '', poValue: '', poValidity: '',
    gstRate: '18', lutRefNo: '', reverseCharge: false,
    tdsApplicableAgency: 'na',
    prefFormatPDF: true, prefFormatXLSX: false, invoiceFooterNotes: '',
    noticePeriod: 30, creditLimit: '', latePenalty: '', billingCurrency: 'INR',

    // Statutory
    pfCeiling: 15000, pfApplicable: true,
    esiLimit: 21000, esiApplicable: true,
    ptState: 'auto', ptApplicable: true,
    lwfFrequency: 'biannual', lwfApplicable: false,
    tdsRegime: 'new', tdsApplicable: true,
    gratuityMode: 'ctc_included', gratuityApplicable: true,
    bonusPct: 8.33, bonusApplicable: false,
    lopBasis: 'inherit',

    // Portal
    portalAccess: false, portalEmail: '', portalAccessLevel: 'view_only',
    portalViewSalary: true, portalViewInvoices: true,
    portalViewPayslips: false, portalRaiseRequests: true,
    portal2fa: true, sessionTimeout: 60, ipWhitelist: '', logoUrl: '',

    // SLA
    attendanceCutoff: '28', payrollLockDay: '3', salaryCreditDay: '7',
    invoiceDisputeDays: 7, invoiceRaiseDay: 'Same as Payroll Lock Day',
    payrollMonthConvention: 'calendar', cycleStartDay: 1, cycleEndDay: 28,
    accountManager: '', backupAccountManager: '', autoReminders: true, clientNotes: '',
  };
}

// Demo branch seed data
export const DEMO_BRANCHES = [
  {
    name: 'Chennai Office', code: 'CHE-01', addr1: '14 Anna Salai, Nandanam', addr2: '',
    city: 'Chennai', state: 'Tamil Nadu', pin: '600035', gstin: '33AABCT1332L1ZQ',
    gstType: 'Regular', pocName: 'Vikas Mehta', pocEmail: 'vikas.mehta@mahindra.com',
    pocPhone: '9884123456', isPrimary: true,
  },
  {
    name: 'Mumbai HQ', code: 'MUM-01', addr1: 'Mahindra Towers, BKC', addr2: '',
    city: 'Mumbai', state: 'Maharashtra', pin: '400051', gstin: '27AABCT1332L1ZA',
    gstType: 'Regular', pocName: 'Priya Nair', pocEmail: 'priya.nair@mahindra.com',
    pocPhone: '9820987654', isPrimary: false,
  },
];
