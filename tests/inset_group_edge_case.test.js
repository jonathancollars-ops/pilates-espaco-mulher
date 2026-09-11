const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');

// Simulate the exact logic from InsetGroupedList.tsx lines 78-107
function simulateInsetGroupCornerCalculation(children) {
  const childArray = React.Children.toArray(children).filter(Boolean);
  const totalRows = childArray.length;

  const results = [];
  React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) {
      results.push({ child, isFirst: undefined, isLast: undefined });
      return child;
    }

    const isFirst = index === 0;
    const isLast = index === totalRows - 1;
    results.push({ childProps: child.props, isFirst, isLast });
    return child;
  });

  return { totalRows, results };
}

describe('InsetGroup Conditional Children Squircle Corner Calculation', () => {
  test('Conditional leading falsy child breaks isFirst calculation', () => {
    const showHeaderItem = false;
    const children = [
      showHeaderItem && React.createElement('div', { key: 'row0', label: 'Item 0' }),
      React.createElement('div', { key: 'row1', label: 'Item 1' }),
      React.createElement('div', { key: 'row2', label: 'Item 2' }),
    ];

    const { totalRows, results } = simulateInsetGroupCornerCalculation(children);
    
    // totalRows is 2 because falsy child is filtered in childArray
    assert.equal(totalRows, 2);

    // But in React.Children.map:
    // item 1 is at index 1 in children!
    const row1Result = results.find(r => r.childProps && r.childProps.label === 'Item 1');
    const row2Result = results.find(r => r.childProps && r.childProps.label === 'Item 2');

    // row1 is the first visible row, but its index is 1! So isFirst is 1 === 0 -> false!
    assert.equal(row1Result.isFirst, false, 'BUG: row1 is the first visible row but gets isFirst = false because index is 1 instead of 0');
    // row2 is the second visible row (index 2), totalRows is 2, totalRows - 1 is 1! So isLast is 2 === 1 -> false!
    assert.equal(row2Result.isLast, false, 'BUG: row2 is the last visible row but gets isLast = false because index is 2 instead of 1');
  });
});
