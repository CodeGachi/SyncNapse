import { describe, it, expect } from '@jest/globals';

// Simple smoke test to ensure Jest pipeline runs in CI
describe('smoke', () => {
  it('runs in CI', () => {
    expect(true).toBe(true);
  });
});
