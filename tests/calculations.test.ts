import { describe, it, expect } from 'vitest';
import {
  calculateWorkHours,
  calculateOvertime,
  calculateOverUnder,
  calculateMonthlyCumulative,
  isValidTimeRange,
} from '@/lib/calculations';

describe('calculateWorkHours', () => {
  it('subtracts break and returns net hours', () => {
    expect(calculateWorkHours('08:30', '17:30', 60)).toBe(8);
  });

  it('returns 0 when end <= start (no silent negative)', () => {
    expect(calculateWorkHours('17:00', '09:00', 60)).toBe(0);
    expect(calculateWorkHours('09:00', '09:00', 0)).toBe(0);
  });

  it('returns 0 for empty strings', () => {
    expect(calculateWorkHours('', '17:30', 60)).toBe(0);
    expect(calculateWorkHours('08:30', '', 60)).toBe(0);
  });

  it('returns 0 for malformed input instead of NaN', () => {
    expect(calculateWorkHours('xx:yy', '17:30', 60)).toBe(0);
  });
});

describe('isValidTimeRange', () => {
  it('accepts end after start', () => {
    expect(isValidTimeRange('08:30', '17:30')).toBe(true);
  });
  it('rejects equal or reversed', () => {
    expect(isValidTimeRange('09:00', '09:00')).toBe(false);
    expect(isValidTimeRange('17:00', '09:00')).toBe(false);
  });
});

describe('calculateOvertime', () => {
  it('returns positive delta above standard', () => {
    expect(calculateOvertime(9.5, 8)).toBe(1.5);
  });
  it('returns 0 when under standard', () => {
    expect(calculateOvertime(7, 8)).toBe(0);
  });
});

describe('calculateOverUnder', () => {
  it('returns signed delta', () => {
    expect(calculateOverUnder(6.5, 8)).toBe(-1.5);
    expect(calculateOverUnder(9, 8)).toBe(1);
  });
});

describe('calculateMonthlyCumulative', () => {
  it('sums overUnder up to currentDay, skipping zero-hour rows', () => {
    const entries = [
      { day: 1, workHours: 8, overUnder: 0 },
      { day: 2, workHours: 9, overUnder: 1 },
      { day: 3, workHours: 0, overUnder: 0 },
      { day: 4, workHours: 7, overUnder: -1 },
    ];
    expect(calculateMonthlyCumulative(entries, 3)).toBe(1);
    expect(calculateMonthlyCumulative(entries, 4)).toBe(0);
  });
});
