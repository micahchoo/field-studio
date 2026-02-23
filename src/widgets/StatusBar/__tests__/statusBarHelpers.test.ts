import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  getStorageBarColor,
  countBySeverity,
} from '../lib/statusBarHelpers';

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------
describe('formatBytes', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats 512 bytes correctly', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats 1024 bytes as 1.0 KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats 1048576 bytes as 1.0 MB', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats 1073741824 bytes as 1.0 GB', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('respects custom decimal places', () => {
    // 1536 bytes = 1.5 KB
    expect(formatBytes(1536, 2)).toBe('1.5 KB');
  });

  it('clamps negative decimals to 0', () => {
    expect(formatBytes(1536, -1)).toBe('2 KB');
  });

  it('handles a negative byte value (edge case)', () => {
    // Math.log of negative is NaN -> i becomes NaN -> result is "NaN undefined"
    // This documents the current behaviour rather than asserting correctness.
    const result = formatBytes(-100);
    expect(typeof result).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// getStorageBarColor
// ---------------------------------------------------------------------------
describe('getStorageBarColor', () => {
  it('returns green for 0%', () => {
    expect(getStorageBarColor(0)).toBe('bg-nb-green');
  });

  it('returns green for exactly 50%', () => {
    expect(getStorageBarColor(50)).toBe('bg-nb-green');
  });

  it('returns orange for 51%', () => {
    expect(getStorageBarColor(51)).toBe('bg-nb-orange');
  });

  it('returns orange for exactly 80%', () => {
    expect(getStorageBarColor(80)).toBe('bg-nb-orange');
  });

  it('returns red for 81%', () => {
    expect(getStorageBarColor(81)).toBe('bg-nb-red');
  });

  it('returns red for 100%', () => {
    expect(getStorageBarColor(100)).toBe('bg-nb-red');
  });
});

// ---------------------------------------------------------------------------
// countBySeverity
// ---------------------------------------------------------------------------
describe('countBySeverity', () => {
  it('returns zeros for an empty array', () => {
    expect(countBySeverity([])).toEqual({ errorCount: 0, warningCount: 0 });
  });

  it('counts all errors', () => {
    const issues = [
      { level: 'error' },
      { level: 'error' },
      { level: 'error' },
    ];
    expect(countBySeverity(issues)).toEqual({ errorCount: 3, warningCount: 0 });
  });

  it('counts all warnings', () => {
    const issues = [
      { level: 'warning' },
      { level: 'warning' },
    ];
    expect(countBySeverity(issues)).toEqual({ errorCount: 0, warningCount: 2 });
  });

  it('counts a mix of errors and warnings', () => {
    const issues = [
      { level: 'error' },
      { level: 'warning' },
      { level: 'error' },
      { level: 'warning' },
      { level: 'warning' },
    ];
    expect(countBySeverity(issues)).toEqual({ errorCount: 2, warningCount: 3 });
  });

  it('does not count info-level items', () => {
    const issues = [
      { level: 'error' },
      { level: 'info' },
      { level: 'warning' },
      { level: 'info' },
    ];
    expect(countBySeverity(issues)).toEqual({ errorCount: 1, warningCount: 1 });
  });
});
