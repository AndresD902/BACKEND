import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessRulesService } from '../../../src/services/businessRules.service';
import { FestivosRepository } from '../../../src/repositories/festivos.repository';
import { BadRequestError } from '../../../src/shared/errors/bad-request.error';

function makeFestivosRepo(): vi.Mocked<FestivosRepository> {
  return {
    findByAnio:    vi.fn(),
    findByRango:   vi.fn().mockResolvedValue([]),
    existeFestivo: vi.fn().mockResolvedValue(false),
    create:        vi.fn(),
  } as unknown as vi.Mocked<FestivosRepository>;
}

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  // keep only date part in UTC
  return new Date(`${d.toISOString().split('T')[0]}T00:00:00.000Z`);
}

describe('BusinessRulesService', () => {
  let repo: vi.Mocked<FestivosRepository>;
  let svc: BusinessRulesService;

  beforeEach(() => {
    repo = makeFestivosRepo();
    svc  = new BusinessRulesService(repo);
  });

  // ──────────────────────────────────────────────
  describe('validarFechasOrden', () => {
    it('does not throw when fechaFin >= fechaInicio', () => {
      const d = new Date('2025-08-01T00:00:00.000Z');
      expect(() => svc.validarFechasOrden(d, d)).not.toThrow();
    });

    it('throws BadRequestError when fechaFin < fechaInicio', () => {
      const inicio = new Date('2025-08-10T00:00:00.000Z');
      const fin    = new Date('2025-08-05T00:00:00.000Z');
      expect(() => svc.validarFechasOrden(inicio, fin)).toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('validarAnticipacion', () => {
    it('does not throw when date is more than 1 month away', () => {
      expect(() => svc.validarAnticipacion(futureDate(45))).not.toThrow();
    });

    it('throws BadRequestError when date is less than 1 month away', () => {
      expect(() => svc.validarAnticipacion(futureDate(10))).toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('validarDiasMinimos', () => {
    it('does not throw for 5 working days', () => {
      expect(() => svc.validarDiasMinimos(5)).not.toThrow();
    });

    it('throws BadRequestError for fewer than 5 working days', () => {
      expect(() => svc.validarDiasMinimos(4)).toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('validarDisponibilidad', () => {
    it('does not throw when diasHabiles <= diasDisponibles', () => {
      expect(() => svc.validarDisponibilidad(10, 15)).not.toThrow();
    });

    it('throws BadRequestError when diasHabiles > diasDisponibles', () => {
      expect(() => svc.validarDisponibilidad(16, 15)).toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('validarFechaInicioHabil', () => {
    it('does not throw for a weekday non-holiday', async () => {
      repo.existeFestivo.mockResolvedValue(false);
      const monday = new Date('2025-07-14T00:00:00.000Z');
      await expect(svc.validarFechaInicioHabil(monday)).resolves.toBeUndefined();
    });

    it('throws BadRequestError for Saturday', async () => {
      const saturday = new Date('2025-07-19T00:00:00.000Z');
      await expect(svc.validarFechaInicioHabil(saturday)).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError for Sunday', async () => {
      const sunday = new Date('2025-07-20T00:00:00.000Z');
      await expect(svc.validarFechaInicioHabil(sunday)).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when date is a holiday', async () => {
      repo.existeFestivo.mockResolvedValue(true);
      const monday = new Date('2025-07-14T00:00:00.000Z');
      await expect(svc.validarFechaInicioHabil(monday)).rejects.toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('calcularDias', () => {
    it('returns correct diasHabiles and diasCalendario with no holidays', async () => {
      repo.findByRango.mockResolvedValue([]);
      const inicio = new Date('2025-07-14T00:00:00.000Z'); // Monday
      const fin    = new Date('2025-07-18T00:00:00.000Z'); // Friday
      const result = await svc.calcularDias(inicio, fin);
      expect(result.diasHabiles).toBe(5);
      expect(result.diasCalendario).toBe(5);
    });

    it('subtracts holidays from diasHabiles', async () => {
      repo.findByRango.mockResolvedValue([
        { id: 1, fecha: new Date('2025-07-15T00:00:00.000Z'), descripcion: 'Festivo', anio: 2025, tipo: 'nacional', activo: true },
      ]);
      const inicio = new Date('2025-07-14T00:00:00.000Z');
      const fin    = new Date('2025-07-18T00:00:00.000Z');
      const result = await svc.calcularDias(inicio, fin);
      expect(result.diasHabiles).toBe(4);
      expect(result.diasCalendario).toBe(5);
    });
  });
});
