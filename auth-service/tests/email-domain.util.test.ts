import { promises as dns } from 'dns';
import { validateEmailDomain } from '../src/utils/email-domain.util';
import { RequestValidationError } from '../src/shared/errors/request-validation.error';

jest.mock('dns', () => ({
  promises: {
    resolveMx: jest.fn(),
  },
}));

const resolveMx = dns.resolveMx as jest.MockedFunction<typeof dns.resolveMx>;

describe('validateEmailDomain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dominio válido con registros MX', () => {
    it('no lanza ningún error cuando el dominio tiene registros MX', async () => {
      resolveMx.mockResolvedValue([{ exchange: 'mail.empresa.com', priority: 10 }]);
      await expect(validateEmailDomain('usuario@empresa.com')).resolves.toBeUndefined();
    });

    it('no lanza ningún error con múltiples registros MX', async () => {
      resolveMx.mockResolvedValue([
        { exchange: 'mx1.gmail.com', priority: 5 },
        { exchange: 'mx2.gmail.com', priority: 10 },
      ]);
      await expect(validateEmailDomain('usuario@gmail.com')).resolves.toBeUndefined();
    });

    it('invoca resolveMx con el dominio extraído del email', async () => {
      resolveMx.mockResolvedValue([{ exchange: 'mail.empresa.com', priority: 10 }]);
      await validateEmailDomain('juan.perez@empresa.com');
      expect(resolveMx).toHaveBeenCalledWith('empresa.com');
    });
  });

  describe('dominio sin registros MX (lista vacía)', () => {
    it('lanza RequestValidationError cuando resolveMx retorna un array vacío', async () => {
      resolveMx.mockResolvedValue([]);
      await expect(validateEmailDomain('usuario@sinmx.com')).rejects.toThrow(
        RequestValidationError,
      );
    });

    it('el mensaje de error menciona el dominio problemático', async () => {
      resolveMx.mockResolvedValue([]);
      await expect(validateEmailDomain('usuario@sinmx.com')).rejects.toThrow(
        'sinmx.com',
      );
    });
  });

  describe('dominio inexistente — código DNS ENOTFOUND', () => {
    it('lanza RequestValidationError para dominios que no existen (ENOTFOUND)', async () => {
      const dnsError = Object.assign(new Error('Domain not found'), { code: 'ENOTFOUND' });
      resolveMx.mockRejectedValue(dnsError);
      await expect(validateEmailDomain('usuario@dominioficticio123456.com')).rejects.toThrow(
        RequestValidationError,
      );
    });

    it('el mensaje de error menciona el dominio problemático (ENOTFOUND)', async () => {
      const dnsError = Object.assign(new Error('Domain not found'), { code: 'ENOTFOUND' });
      resolveMx.mockRejectedValue(dnsError);
      await expect(
        validateEmailDomain('usuario@dominioficticio123456.com'),
      ).rejects.toThrow('dominioficticio123456.com');
    });
  });

  describe('dominio sin registros MX — código DNS ENODATA', () => {
    it('lanza RequestValidationError cuando no hay registros MX (ENODATA)', async () => {
      const dnsError = Object.assign(new Error('No data'), { code: 'ENODATA' });
      resolveMx.mockRejectedValue(dnsError);
      await expect(validateEmailDomain('usuario@sinregistros.com')).rejects.toThrow(
        RequestValidationError,
      );
    });

    it('el mensaje de error menciona el dominio problemático (ENODATA)', async () => {
      const dnsError = Object.assign(new Error('No data'), { code: 'ENODATA' });
      resolveMx.mockRejectedValue(dnsError);
      await expect(validateEmailDomain('usuario@sinregistros.com')).rejects.toThrow(
        'sinregistros.com',
      );
    });
  });

  describe('errores DNS temporales — estrategia fail-open', () => {
    it('no lanza error ante un timeout DNS (ETIMEOUT)', async () => {
      const dnsError = Object.assign(new Error('Timeout'), { code: 'ETIMEOUT' });
      resolveMx.mockRejectedValue(dnsError);
      await expect(validateEmailDomain('usuario@empresa.com')).resolves.toBeUndefined();
    });

    it('no lanza error ante un error de red genérico (ECONNREFUSED)', async () => {
      const dnsError = Object.assign(new Error('Connection refused'), {
        code: 'ECONNREFUSED',
      });
      resolveMx.mockRejectedValue(dnsError);
      await expect(validateEmailDomain('usuario@empresa.com')).resolves.toBeUndefined();
    });

    it('no lanza error ante un error sin código de error conocido', async () => {
      resolveMx.mockRejectedValue(new Error('Unknown DNS error'));
      await expect(validateEmailDomain('usuario@empresa.com')).resolves.toBeUndefined();
    });
  });

  describe('casos límite de formato de email', () => {
    it('retorna sin error cuando el email no tiene dominio (protección Zod previa)', async () => {
      await expect(validateEmailDomain('emailsinarroba')).resolves.toBeUndefined();
      expect(resolveMx).not.toHaveBeenCalled();
    });

    it('extrae el dominio correctamente de emails con subdominios', async () => {
      resolveMx.mockResolvedValue([{ exchange: 'mail.sub.empresa.com', priority: 10 }]);
      await validateEmailDomain('usuario@sub.empresa.com');
      expect(resolveMx).toHaveBeenCalledWith('sub.empresa.com');
    });

    it('solo llama a resolveMx una vez por invocación', async () => {
      resolveMx.mockResolvedValue([{ exchange: 'mail.empresa.com', priority: 10 }]);
      await validateEmailDomain('usuario@empresa.com');
      expect(resolveMx).toHaveBeenCalledTimes(1);
    });
  });
});
