import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { validateBody } from '../../../src/middlewares/validation.middleware';
import { AppError } from '../../../src/shared/errors/app-error';

const schema = z.object({
  nombre: z.string().min(1),
  email: z.email(),
});

function makeReq(body: unknown) {
  return { body } as Request;
}

describe('validateBody', () => {
  it('llama a next sin error cuando el body es válido', () => {
    const req = makeReq({ nombre: 'Admin', email: 'admin@test.com' });
    const next = vi.fn();

    validateBody(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ nombre: 'Admin', email: 'admin@test.com' });
  });

  it('reemplaza req.body con datos parseados por Zod', () => {
    const req = makeReq({ nombre: '  Admin  ', email: 'admin@test.com', extraField: 'ignorado' });
    const next = vi.fn();

    validateBody(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).not.toHaveProperty('extraField');
  });

  it('llama a next con AppError cuando el body es inválido', () => {
    const req = makeReq({ nombre: '', email: 'no-es-email' });
    const next = vi.fn();

    validateBody(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('incluye detalles de campos inválidos en el error', () => {
    const req = makeReq({ nombre: 'OK', email: 'invalido' });
    const next = vi.fn();

    validateBody(schema)(req, {} as Response, next);

    const err = next.mock.calls[0][0] as AppError;
    const details = err.details as Array<{ field: string; message: string }>;
    expect(Array.isArray(details)).toBe(true);
    expect(details.some((d) => d.field === 'email')).toBe(true);
  });

  it('llama a next con error cuando el body está vacío', () => {
    const req = makeReq({});
    const next = vi.fn();

    validateBody(schema)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });
});
