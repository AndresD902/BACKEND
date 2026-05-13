import { promises as dns } from 'dns';
import { RequestValidationError } from '../shared/errors/request-validation.error';

const INVALID_DNS_CODES = new Set(['ENOTFOUND', 'ENODATA']);

export async function validateEmailDomain(email: string): Promise<void> {
  const [, domain] = email.split('@');

  // El formato ya fue validado previamente por Zod
  if (!domain) return;

  let mxRecords: Awaited<ReturnType<typeof dns.resolveMx>>;

  try {
    mxRecords = await dns.resolveMx(domain);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;

    // Dominio inexistente o sin registros MX
    if (code && INVALID_DNS_CODES.has(code)) {
      throw new RequestValidationError(
        `El dominio "${domain}" no puede recibir correos electrónicos. Verifique que la dirección sea válida.`,
      );
    }

    // Fail-open:
    // errores temporales DNS no deben bloquear usuarios legítimos
    return;
  }

  if (mxRecords.length === 0) {
    throw new RequestValidationError(
      `El dominio "${domain}" no puede recibir correos electrónicos.`,
    );
  }
}