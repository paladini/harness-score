import { test, expect } from 'vitest';

test('greets by name', () => {
  expect(`hello, ada`).toContain('ada');
});
