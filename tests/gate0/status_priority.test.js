const { test, expect } = require('vitest');

// Simple unit test for status priority logic (protected > signed)
function effectiveStatus(rawStatus, hasTsa) {
  if (hasTsa) return 'protected';
  return rawStatus;
}

test('priority: protected beats signed when TSA exists', () => {
  expect(effectiveStatus('signed', true)).toBe('protected');
  expect(effectiveStatus('signed', false)).toBe('signed');
});
