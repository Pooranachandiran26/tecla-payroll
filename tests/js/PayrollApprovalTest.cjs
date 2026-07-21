// Mock React, hooks, and global helper functions for Node environment
global.route = (name, params) => `${name}-${JSON.stringify(params)}`;

let stateStore = {};
let stateIndex = 0;

global.React = {
  createElement: (type, props, ...children) => {
    return {
      type,
      props: props || {},
      children: children.flat(Infinity)
    };
  },
  useState: (initial) => {
    const currentIndex = stateIndex++;
    if (!(currentIndex in stateStore)) {
      stateStore[currentIndex] = initial;
    }
    const setState = (val) => {
      stateStore[currentIndex] = typeof val === 'function' ? val(stateStore[currentIndex]) : val;
    };
    return [stateStore[currentIndex], setState];
  }
};

// Mock the modules that esbuild marks as external
const mockModules = {
  'react': global.React,
  '@inertiajs/react': {
    Link: ({ children, ...props }) => ({ type: 'Link', props, children }),
    Head: ({ title }) => ({ type: 'Head', props: { title } }),
    router: {
      post: () => {},
      visit: () => {},
      reload: () => {}
    },
    usePage: () => ({
      props: {
        auth: {
          user: { role: 'admin' }
        }
      }
    })
  },
  '@/Layouts/AuthenticatedLayout': ({ children }) => ({ type: 'AuthenticatedLayout', children }),
  '../../Components/RoleGuard.jsx': ({ children }) => ({ type: 'RoleGuard', children }),
  '../../Hooks/useToast': () => ({ showToast: () => {} })
};

const originalRequire = module.constructor.prototype.require;
module.constructor.prototype.require = function (path) {
  // 1. Exact match
  if (mockModules[path]) {
    return mockModules[path];
  }
  
  // 2. Suffix match for relative/aliased paths only
  for (const [mockPath, mockExport] of Object.entries(mockModules)) {
    if (path === mockPath) {
      return mockExport;
    }
    if ((path.startsWith('.') || path.startsWith('/') || path.startsWith('@/')) && path.endsWith(mockPath.replace(/^\.\.\/\.\.\//, ''))) {
      return mockExport;
    }
  }

  try {
    return originalRequire.apply(this, arguments);
  } catch (err) {
    // Return empty mock for relative assets (like CSS)
    if (path.endsWith('.css')) {
      return {};
    }
    throw err;
  }
};

const PayrollApproval = require('./PayrollApproval.compiled.cjs').default;
const assert = require('assert');

// Traversal helpers
function findElementsByType(node, type) {
  let results = [];
  if (!node) return results;
  if (node.type === type) {
    results.push(node);
  }
  if (node.children) {
    node.children.forEach(child => {
      results = results.concat(findElementsByType(child, type));
    });
  }
  if (node.props && node.props.children) {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
    children.forEach(child => {
      results = results.concat(findElementsByType(child, type));
    });
  }
  return results;
}

function findElementsByStyle(node, styleProp, value) {
  let results = [];
  if (!node) return results;
  if (node.props && node.props.style && node.props.style[styleProp] === value) {
    results.push(node);
  }
  if (node.children) {
    node.children.forEach(child => {
      results = results.concat(findElementsByStyle(child, styleProp, value));
    });
  }
  if (node.props && node.props.children) {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
    children.forEach(child => {
      results = results.concat(findElementsByStyle(child, styleProp, value));
    });
  }
  return results;
}

function findElementsByClassName(node, className) {
  let results = [];
  if (!node) return results;
  if (node.props && node.props.className && node.props.className.split(' ').includes(className)) {
    results.push(node);
  }
  if (node.children) {
    node.children.forEach(child => {
      results = results.concat(findElementsByClassName(child, className));
    });
  }
  if (node.props && node.props.children) {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
    children.forEach(child => {
      results = results.concat(findElementsByClassName(child, className));
    });
  }
  return results;
}

// 1. Test case: 0 excluded, 1 new hire. Button should be visible.
console.log('Test case: Rendering PayrollApproval with 0 excluded, 1 new hire...');
const props1 = {
  clients: [{ id: 1, company_name: 'Test Client' }],
  selectedClientId: 1,
  selectedMonth: '2026-07-01',
  run: { id: 10, status: 'locked' },
  items: [{ id: 1, employee_id: 1, is_excluded: 0, gross_total: 10000, net_pay: 9000, lop_deduction: 0, employee_pf: 1300, employee_esi: 0, professional_tax: 200, tds_deduction: 0, loan_emi_deduction: 0, paid_days: 30 }],
  preflight: [],
  cycleInfo: null,
  newHires: [{ id: 2, full_name: 'Jane Doe', employee_code: 'TEC-115', date_of_joining: '2026-07-15' }]
};

stateStore = {};
stateIndex = 0;
const vdom1 = PayrollApproval(props1);

// Find the warning container by its unique style (backgroundColor: '#FFFBEB')
const warningCards = findElementsByStyle(vdom1, 'backgroundColor', '#FFFBEB');
assert.strictEqual(warningCards.length, 1, 'Warning card container should render');

// Check the text contents
const spanElement = findElementsByType(warningCards[0], 'span')[0];
assert.ok(spanElement, 'Should render a span within warning card');
const actualText = spanElement.children.join('');
const expectedText = '0 excluded + 1 new hires — click \'Create Supplementary Run\' to process them.';
assert.strictEqual(actualText, expectedText, 'Span text matches expected counts');

const buttonElement = findElementsByType(warningCards[0], 'button')[0];
assert.ok(buttonElement, 'Should render a button within warning card');
const actualBtnLabel = buttonElement.children.join('');
const expectedBtnLabel = 'Create Supplementary Run for 0 Excluded + 1 New Hires';
assert.strictEqual(actualBtnLabel, expectedBtnLabel, 'Button label matches expected counts');

// 2. Click simulation & modal visibility test
console.log('Test case: Simulating click on Create Supplementary Run button...');
assert.strictEqual(typeof buttonElement.props.onClick, 'function', 'Button must have an onClick function handler');

// Fire the onClick callback
buttonElement.props.onClick();

// Re-render component with updated state
stateIndex = 0;
const vdomAfterClick = PayrollApproval(props1);

// Find the modal overlay element by className
const modalOverlays = findElementsByClassName(vdomAfterClick, 'modal-overlay');
assert.strictEqual(modalOverlays.length, 1, 'Modal overlay container must render after click');

// Crucial assertion: Verify the modal overlay has the 'active' CSS class name (which grants opacity: 1 and pointer-events: auto)
const classNameStr = modalOverlays[0].props.className;
assert.ok(classNameStr.split(' ').includes('active'), 'Modal overlay MUST have the "active" CSS class to be visible on screen');

console.log('All PayrollApproval.jsx frontend rendering and click interaction JS tests passed successfully!');
