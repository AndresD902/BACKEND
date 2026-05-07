import { calcularDiasCalendario, calcularDiasHabiles } from '../../../src/utils/vacation-days.util';

describe('vacation-days.util', () => {
  describe('calcularDiasCalendario', () => {
    it('counts a single day as 1', () => {
      const d = new Date('2025-07-14T00:00:00.000Z');
      expect(calcularDiasCalendario(d, d)).toBe(1);
    });

    it('counts a 5-day period correctly (Mon–Fri)', () => {
      const inicio = new Date('2025-07-14T00:00:00.000Z');
      const fin    = new Date('2025-07-18T00:00:00.000Z');
      expect(calcularDiasCalendario(inicio, fin)).toBe(5);
    });

    it('counts a full week including weekend', () => {
      const inicio = new Date('2025-07-14T00:00:00.000Z');
      const fin    = new Date('2025-07-20T00:00:00.000Z');
      expect(calcularDiasCalendario(inicio, fin)).toBe(7);
    });
  });

  describe('calcularDiasHabiles', () => {
    it('counts Mon–Fri (5 days) with no holidays', () => {
      const inicio = new Date('2025-07-14T00:00:00.000Z'); // Monday
      const fin    = new Date('2025-07-18T00:00:00.000Z'); // Friday
      expect(calcularDiasHabiles(inicio, fin, [])).toBe(5);
    });

    it('excludes Saturday and Sunday', () => {
      const inicio = new Date('2025-07-14T00:00:00.000Z'); // Monday
      const fin    = new Date('2025-07-20T00:00:00.000Z'); // Sunday
      expect(calcularDiasHabiles(inicio, fin, [])).toBe(5);
    });

    it('excludes holidays that fall on working days', () => {
      const inicio   = new Date('2025-07-14T00:00:00.000Z');
      const fin      = new Date('2025-07-18T00:00:00.000Z');
      const holiday  = new Date('2025-07-15T00:00:00.000Z'); // Tuesday
      expect(calcularDiasHabiles(inicio, fin, [holiday])).toBe(4);
    });

    it('does not double-subtract a holiday that lands on a weekend', () => {
      const inicio  = new Date('2025-07-14T00:00:00.000Z');
      const fin     = new Date('2025-07-18T00:00:00.000Z');
      const holiday = new Date('2025-07-19T00:00:00.000Z'); // Saturday
      expect(calcularDiasHabiles(inicio, fin, [holiday])).toBe(5);
    });

    it('returns 0 for a range that is entirely on weekends', () => {
      const inicio = new Date('2025-07-19T00:00:00.000Z'); // Saturday
      const fin    = new Date('2025-07-20T00:00:00.000Z'); // Sunday
      expect(calcularDiasHabiles(inicio, fin, [])).toBe(0);
    });
  });
});
