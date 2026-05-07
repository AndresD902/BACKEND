import { toCsvRow, buildEmployeeCsv, EMPLOYEE_CSV_HEADERS } from '../../../src/utils/report-formatter.util';

describe('toCsvRow', () => {
  it('joins fields with commas', () => {
    expect(toCsvRow(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('wraps fields containing commas in quotes', () => {
    expect(toCsvRow(['hello, world', 'ok'])).toBe('"hello, world",ok');
  });

  it('escapes double-quotes inside quoted fields', () => {
    expect(toCsvRow(['say "hi"'])).toBe('"say ""hi"""');
  });

  it('handles null and undefined as empty strings, preserves 0 and false', () => {
    expect(toCsvRow([null, undefined, 0, false])).toBe(',,0,false');
  });

  it('wraps fields with newlines in quotes', () => {
    expect(toCsvRow(['line1\nline2'])).toBe('"line1\nline2"');
  });
});

describe('buildEmployeeCsv', () => {
  it('returns just the header row for an empty array', () => {
    const csv = buildEmployeeCsv([]);
    expect(csv).toBe(toCsvRow(EMPLOYEE_CSV_HEADERS));
  });

  it('adds a data row for each employee', () => {
    const emp = {
      id: 1, cedula: '123', tipo_documento: 'cedula_ciudadania',
      nombre: 'Ana', apellido: 'Pérez', genero: 'femenino',
      fecha_nacimiento: null, celular: '3001234567', telefono_fijo: null,
      correo_personal: null, correo_corporativo: 'ana@empresa.com',
      direccion: null, ciudad: 'Bogotá', departamento: 'Cundinamarca',
      nivel_educativo: 'universitario', estado: 'activo', razon_estado: null,
      fecha_ingreso: '2023-01-01', fecha_retiro: null, created_at: '2023-01-01',
    };
    const csv = buildEmployeeCsv([emp]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(toCsvRow(EMPLOYEE_CSV_HEADERS));
    expect(lines[1]).toContain('Ana');
    expect(lines[1]).toContain('Pérez');
  });

  it('handles commas in employee fields', () => {
    const emp = { id: 1, nombre: 'Juan, Carlos', apellido: 'García' } as unknown as Record<string, unknown>;
    const csv = buildEmployeeCsv([emp]);
    expect(csv).toContain('"Juan, Carlos"');
  });
});
