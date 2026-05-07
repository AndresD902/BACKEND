import { promises as dns } from 'dns';
import { RequestValidationError } from '../shared/errors/request-validation.error';

/**
 * Verifies that the email domain has MX records, meaning it can actually receive email.
 * Throws RequestValidationError for domains confirmed to not exist or have no mail servers.
 * Fails open (allows registration) on DNS timeouts or server errors to avoid blocking
 * legitimate users when DNS infrastructure is temporarily unavailable.
 */
export async function validateEmailDomain(email: string): Promise<void> {
  const domain = email.split('@')[1];
  if (!domain) return; // Zod validates email format before this runs

  let hasMx = true; // default: fail open

  try {
    const records = await dns.resolveMx(domain);
    hasMx = records.length > 0;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    // ENOTFOUND = domain does not exist; ENODATA = domain exists but has no MX records
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      hasMx = false;
    }
    // ETIMEOUT, ECONNREFUSED, ESERVFAIL, etc. → leave hasMx = true (fail open)
  }

  if (!hasMx) {
    throw new RequestValidationError(
      `El dominio "${domain}" no puede recibir correos electrónicos. Verifique que la dirección sea válida.`,
    );
  }
}
