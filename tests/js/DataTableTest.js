// Mock React for Node environment
global.React = {
  createElement: (type, props, ...children) => {
    return {
      type,
      props: props || {},
      children: children.flat(Infinity)
    };
  }
};

const DataTable = require('./DataTable.compiled.js').default;
const assert = require('assert');

// Test data
const data = [
  { id: 1, emp_name: 'John Doe', salary: 15000, status: 'Present' }
];

// 1. Test the "label/key/render" style
const columnsStyle1 = [
  {
    label: 'Employee Name (Style 1)',
    key: 'emp_name',
    render: (val, row, index) => `Rendered: ${val} (row index ${index})`
  }
];

const rendered1 = DataTable({ columns: columnsStyle1, data });

// Helper to find all elements by type
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
  return results;
}

// Assertions for Style 1 (label/key/render)
console.log('Running assertions for Style 1 (label/key/render)...');
const ths1 = findElementsByType(rendered1, 'th');
assert.strictEqual(ths1.length, 1, 'Should render 1 th element');
assert.strictEqual(ths1[0].children[0], 'Employee Name (Style 1)', 'Should render correct header label');

const tds1 = findElementsByType(rendered1, 'td');
assert.strictEqual(tds1.length, 1, 'Should render 1 td element');
assert.strictEqual(tds1[0].children[0], 'Rendered: John Doe (row index 0)', 'Should correctly call render function with (val, row, index)');

// 2. Test the "header/accessor/cell" style
const columnsStyle2 = [
  {
    header: 'Employee Name (Style 2)',
    accessor: 'emp_name',
    cell: (row, index) => `Cell: ${row.emp_name} (row index ${index})`
  }
];

const rendered2 = DataTable({ columns: columnsStyle2, data });

// Assertions for Style 2 (header/accessor/cell)
console.log('Running assertions for Style 2 (header/accessor/cell)...');
const ths2 = findElementsByType(rendered2, 'th');
assert.strictEqual(ths2.length, 1, 'Should render 1 th element');
assert.strictEqual(ths2[0].children[0], 'Employee Name (Style 2)', 'Should render correct header title');

const tds2 = findElementsByType(rendered2, 'td');
assert.strictEqual(tds2.length, 1, 'Should render 1 td element');
assert.strictEqual(tds2[0].children[0], 'Cell: John Doe (row index 0)', 'Should correctly call cell function with (row, index)');

// 3. Test empty data fallback
console.log('Running assertions for empty data rendering...');
const emptyRendered = DataTable({ columns: columnsStyle1, data: [] });
const fallbackTds = findElementsByType(emptyRendered, 'td');
assert.strictEqual(fallbackTds.length, 1, 'Should render fallback row');
assert.ok(fallbackTds[0].children[0].children.includes('No data available'), 'Should display fallback text');

console.log('All DataTable.jsx JS tests passed successfully!');
