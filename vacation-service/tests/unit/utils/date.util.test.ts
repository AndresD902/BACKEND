import { describe, it, expect } from 'vitest';
import { toDateOnly, parseDate, currentYear } from '../../../src/utils/date.util';

describe('date.util', () => {
  describe('toDateOnly', () => {
    it('formats a UTC date to YYYY-MM-DD string', () => {
      const date = new Date('2025-07-15T00:00:00.000Z');
      expect(toDateOnly(date)).toBe('2025-07-15');
    });

    it('uses UTC so time zone does not shift the day', () => {
      const date = new Date('2025-01-01T23:59:59.000Z');
      expect(toDateOnly(date)).toBe('2025-01-01');
    });
  });

  describe('parseDate', () => {
    it('parses YYYY-MM-DD as midnight UTC', () => {
      const date = parseDate('2025-06-20');
      expect(date.toISOString()).toBe('2025-06-20T00:00:00.000Z');
    });

    it('returns a Date instance', () => {
      expect(parseDate('2025-03-10')).toBeInstanceOf(Date);
    });
  });

  describe('currentYear', () => {
    it('returns the current year as a number', () => {
      expect(currentYear()).toBe(new Date().getFullYear());
    });
  });
});
