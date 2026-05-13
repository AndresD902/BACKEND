import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockService = vi.hoisted(() => ({
  registrarCambio:       vi.fn(),
  registrarAccion:       vi.fn(),
  getCambiosPorEmpleado: vi.fn(),
  getCambios:            vi.fn(),
  getAcciones:           vi.fn(),
}));

vi.mock('../../../src/services/history.service', () => ({
  historyService: mockService,
}));

import { HistoryController } from '../../../src/controllers/history.controller';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockRes(): jest.Mocked<Response> {
  const r = { status: vi.fn(), json: vi.fn() } as any;
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  return r;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides } as any;
}

const CAMBIO = {
  id: 1,
  empleado_id: 5,
  campo_modificado: 'nombre',
  usuario_modificador: 'admin@test.com',
  fecha_modificacion: new Date(),
};

const ACCION = {
  id: 1,
  accion: 'LOGIN',
  resultado: 'exitoso',
  fecha: new Date(),
};

let controller: HistoryController;
let res: ReturnType<typeof mockRes>;
let next: NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
  controller = new HistoryController();
  res  = mockRes();
  next = vi.fn();
});

// ── registrarCambio ───────────────────────────────────────────────────────────

describe('registrarCambio', () => {
  it('responds 201 with the created cambio on success', async () => {
    mockService.registrarCambio.mockResolvedValue(CAMBIO);
    const req = makeReq({ body: { empleado_id: 5, campo_modificado: 'nombre' } });

    await controller.registrarCambio(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: CAMBIO });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with error when service throws', async () => {
    mockService.registrarCambio.mockRejectedValue(new Error('DB error'));

    await controller.registrarCambio(makeReq(), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── registrarAccion ───────────────────────────────────────────────────────────

describe('registrarAccion', () => {
  it('responds 201 with the created accion on success', async () => {
    mockService.registrarAccion.mockResolvedValue(ACCION);
    const req = makeReq({ body: { accion: 'LOGIN' } });

    await controller.registrarAccion(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: ACCION });
  });

  it('calls next with error when service throws', async () => {
    mockService.registrarAccion.mockRejectedValue(new Error('DB error'));

    await controller.registrarAccion(makeReq(), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── getCambiosPorEmpleado ─────────────────────────────────────────────────────

describe('getCambiosPorEmpleado', () => {
  it('responds 200 with paginated cambios on success', async () => {
    mockService.getCambiosPorEmpleado.mockResolvedValue({ cambios: [CAMBIO], total: 1 });
    const req = makeReq({ params: { id: '5' }, query: {} });

    await controller.getCambiosPorEmpleado(req as any, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { cambios: [CAMBIO], total: 1, page: 1, limit: 50 },
    });
  });

  it('uses page and limit from query params', async () => {
    mockService.getCambiosPorEmpleado.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ params: { id: '5' }, query: { page: '3', limit: '20' } });

    await controller.getCambiosPorEmpleado(req as any, res, next);

    expect(mockService.getCambiosPorEmpleado).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ limit: 20, offset: 40 }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ page: 3, limit: 20 }) }),
    );
  });

  it('caps limit at 100 when a higher value is provided', async () => {
    mockService.getCambiosPorEmpleado.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ params: { id: '5' }, query: { limit: '200' } });

    await controller.getCambiosPorEmpleado(req as any, res, next);

    expect(mockService.getCambiosPorEmpleado).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ limit: 100 }),
    );
  });

  it('converts entidad_id query param to number when provided', async () => {
    mockService.getCambiosPorEmpleado.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ params: { id: '5' }, query: { entidad_id: '42' } });

    await controller.getCambiosPorEmpleado(req as any, res, next);

    expect(mockService.getCambiosPorEmpleado).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ entidad_id: 42 }),
    );
  });

  it('passes entidad_id as undefined when not in query params', async () => {
    mockService.getCambiosPorEmpleado.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ params: { id: '5' }, query: {} });

    await controller.getCambiosPorEmpleado(req as any, res, next);

    expect(mockService.getCambiosPorEmpleado).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ entidad_id: undefined }),
    );
  });

  it('forwards entidad, desde and hasta query params to service', async () => {
    mockService.getCambiosPorEmpleado.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({
      params: { id: '5' },
      query: { entidad: 'cargo', desde: '2026-01-01', hasta: '2026-12-31' },
    });

    await controller.getCambiosPorEmpleado(req as any, res, next);

    expect(mockService.getCambiosPorEmpleado).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ entidad: 'cargo', desde: '2026-01-01', hasta: '2026-12-31' }),
    );
  });

  it('calls next with error when service throws', async () => {
    mockService.getCambiosPorEmpleado.mockRejectedValue(new Error('DB error'));
    const req = makeReq({ params: { id: '5' }, query: {} });

    await controller.getCambiosPorEmpleado(req as any, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── getCambios ────────────────────────────────────────────────────────────────

describe('getCambios', () => {
  it('responds 200 with paginated cambios on success', async () => {
    mockService.getCambios.mockResolvedValue({ cambios: [CAMBIO], total: 1 });

    await controller.getCambios(makeReq() as any, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { cambios: [CAMBIO], total: 1, page: 1, limit: 50 },
    });
  });

  it('applies pagination with custom page and limit', async () => {
    mockService.getCambios.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ query: { page: '2', limit: '10' } });

    await controller.getCambios(req as any, res, next);

    expect(mockService.getCambios).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 10 }),
    );
  });

  it('caps limit at 100', async () => {
    mockService.getCambios.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ query: { limit: '999' } });

    await controller.getCambios(req as any, res, next);

    expect(mockService.getCambios).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it('converts empleado_id query param to number when provided', async () => {
    mockService.getCambios.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ query: { empleado_id: '7' } });

    await controller.getCambios(req as any, res, next);

    expect(mockService.getCambios).toHaveBeenCalledWith(
      expect.objectContaining({ empleado_id: 7 }),
    );
  });

  it('passes empleado_id as undefined when not in query params', async () => {
    mockService.getCambios.mockResolvedValue({ cambios: [], total: 0 });

    await controller.getCambios(makeReq() as any, res, next);

    expect(mockService.getCambios).toHaveBeenCalledWith(
      expect.objectContaining({ empleado_id: undefined }),
    );
  });

  it('converts entidad_id query param to number when provided', async () => {
    mockService.getCambios.mockResolvedValue({ cambios: [], total: 0 });
    const req = makeReq({ query: { entidad_id: '3' } });

    await controller.getCambios(req as any, res, next);

    expect(mockService.getCambios).toHaveBeenCalledWith(
      expect.objectContaining({ entidad_id: 3 }),
    );
  });

  it('calls next with error when service throws', async () => {
    mockService.getCambios.mockRejectedValue(new Error('DB error'));

    await controller.getCambios(makeReq() as any, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── getAcciones ───────────────────────────────────────────────────────────────

describe('getAcciones', () => {
  it('responds 200 with paginated acciones on success', async () => {
    mockService.getAcciones.mockResolvedValue({ acciones: [ACCION], total: 1 });

    await controller.getAcciones(makeReq() as any, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { acciones: [ACCION], total: 1, page: 1, limit: 50 },
    });
  });

  it('applies pagination with custom page and limit', async () => {
    mockService.getAcciones.mockResolvedValue({ acciones: [], total: 0 });
    const req = makeReq({ query: { page: '4', limit: '25' } });

    await controller.getAcciones(req as any, res, next);

    expect(mockService.getAcciones).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25, offset: 75 }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ page: 4, limit: 25 }) }),
    );
  });

  it('caps limit at 100', async () => {
    mockService.getAcciones.mockResolvedValue({ acciones: [], total: 0 });
    const req = makeReq({ query: { limit: '500' } });

    await controller.getAcciones(req as any, res, next);

    expect(mockService.getAcciones).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it('forwards accion, resultado, usuario_email, desde and hasta query params', async () => {
    mockService.getAcciones.mockResolvedValue({ acciones: [], total: 0 });
    const req = makeReq({
      query: {
        accion: 'LOGIN',
        resultado: 'fallido',
        usuario_email: 'admin@test.com',
        desde: '2026-01-01',
        hasta: '2026-12-31',
      },
    });

    await controller.getAcciones(req as any, res, next);

    expect(mockService.getAcciones).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'LOGIN',
        resultado: 'fallido',
        usuario_email: 'admin@test.com',
        desde: '2026-01-01',
        hasta: '2026-12-31',
      }),
    );
  });

  it('calls next with error when service throws', async () => {
    mockService.getAcciones.mockRejectedValue(new Error('DB error'));

    await controller.getAcciones(makeReq() as any, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
