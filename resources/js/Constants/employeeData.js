// Sample employee roster and client branches for demo pages

export const EMPLOYEE_ROSTER = [
  { code: 'TEC-088', name: 'Aarav Sharma', client: 'Mahindra Corp', role: 'Sr. Developer', type: 'Agency Contract', doj: '2024-03-15', status: 'active', uan: '100523485790' },
  { code: 'TEC-092', name: 'Priya Patel', client: 'Mahindra Corp', role: 'QA Lead', type: 'Agency Contract', doj: '2024-04-01', status: 'active', uan: '100523485791' },
  { code: 'TEC-095', name: 'Vikram Singh', client: 'TCS', role: 'DevOps Engineer', type: 'Pass-through EOR', doj: '2024-05-20', status: 'active', uan: '100523485792' },
  { code: 'TEC-101', name: 'Meera Joshi', client: 'Reliance Digital', role: 'UI Designer', type: 'Agency Contract', doj: '2024-06-10', status: 'active', uan: '100523485793' },
  { code: 'TEC-105', name: 'Rahul Kumar', client: 'Wipro Ltd', role: 'Data Analyst', type: 'Hybrid', doj: '2024-07-15', status: 'active', uan: '100523485794' },
  { code: 'TEC-108', name: 'Sneha Reddy', client: 'Mahindra Corp', role: 'Project Manager', type: 'Agency Contract', doj: '2024-01-10', status: 'active', uan: '100523485795' },
  { code: 'TEC-110', name: 'Amit Verma', client: 'TCS', role: 'Backend Developer', type: 'Pass-through EOR', doj: '2023-11-01', status: 'exited', uan: '100523485796' },
  { code: 'TEC-112', name: 'Kavita Nair', client: 'Reliance Digital', role: 'HR Coordinator', type: 'Agency Contract', doj: '2024-08-01', status: 'pending', uan: '100523485797' },
  { code: 'TEC-115', name: 'Rajesh Gupta', client: 'Wipro Ltd', role: 'Full Stack Dev', type: 'Hybrid', doj: '2024-02-15', status: 'active', uan: '100523485798' },
  { code: 'TEC-118', name: 'Ananya Das', client: 'Mahindra Corp', role: 'Test Engineer', type: 'Agency Contract', doj: '2024-09-01', status: 'active', uan: '100523485799' },
];

export const CLIENT_BRANCHES = {
  mahindra: [
    { id: 'mah-mum', name: 'Mumbai HQ', city: 'Mumbai', state: 'Maharashtra' },
    { id: 'mah-pun', name: 'Pune Tech Park', city: 'Pune', state: 'Maharashtra' },
    { id: 'mah-blr', name: 'Bangalore Office', city: 'Bangalore', state: 'Karnataka' },
  ],
  tcs: [
    { id: 'tcs-che', name: 'Chennai Campus', city: 'Chennai', state: 'Tamil Nadu' },
    { id: 'tcs-hyd', name: 'Hyderabad SEZ', city: 'Hyderabad', state: 'Telangana' },
  ],
  reliance: [
    { id: 'rel-mum', name: 'Navi Mumbai', city: 'Navi Mumbai', state: 'Maharashtra' },
  ],
  wipro: [
    { id: 'wip-blr', name: 'Electronic City', city: 'Bangalore', state: 'Karnataka' },
    { id: 'wip-pun', name: 'Hinjewadi', city: 'Pune', state: 'Maharashtra' },
  ],
};
