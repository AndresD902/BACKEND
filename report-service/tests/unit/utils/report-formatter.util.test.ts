import { describe, it, expect } from 'vitest';
import {
  toCsvRow,
  buildEmployeeCsv,
  empleadoToRow,
  EMPLOYEE_CSV_HEADERS,
} from '../../../src/utils/report-formatter.util';

// ─── toCsvRow ─────────────────────────────────────────────────────────────────

describe('toCsvRow', () => {
  it('joins plain fields with commas', () => {
    expect(toCsvRow(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('wraps fields that contain commas in double-quotes', () => {
    expect(toCsvRow(['hello, world', 'ok'])).toBe('"hello, world",ok');
  });

  it('escapes internal double-quotes by doubling them', () => {
    expect(toCsvRow(['say "hi"'])).toBe('"say ""hi"""');
  });

  it('handles null and undefined as empty strings, preserves 0 and false', () => {
    expect(toCsvRow([null, undefined, 0, false])).toBe(',,0,false');
  });

  it('wraps fields that contain newlines in double-quotes', () => {
    expect(toCsvRow(['line1\nline2'])).toBe('"line1\nline2"');
  });

  it('wraps fields that contain carriage returns in double-quotes', () => {
    expect(toCsvRow(['line1\rline2'])).toBe('"line1\rline2"');
  });

  it('returns an empty string for an empty array', () => {
    expect(toCsvRow([])).toBe('');
  });
});

// ─── empleadoToRow ─────────────────────────────────────────────────────────────

describe('empleadoToRow', () => {
  it('extracts properties in the expected column order', () => {
    const emp = {
      id: 7,
      cedula: '9876543',
      tipo_documento: 'pasaporte',
      nombre: 'Laura',
      apellido: 'Martínez',
      genero: 'femenino',
      fecha_nacimiento: '1990-05-01',
      celular: '3109876543',
      telefono_fijo: null,
      correo_personal: 'laura@mail.com',
      correo_corporativo: 'laura@empresa.com',
      direccion: 'Calle 10',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      nivel_educativo: 'posgrado',
      estado: 'activo',
      razon_estado: null,
      fecha_ingreso: '2022-03-01',
      fecha_retiro: null,
      created_at: '2022-03-01T00:00:00.000Z',
    };

    const row = empleadoToRow(emp);

    expect(row).toHaveLength(EMPLOYEE_CSV_HEADERS.length);
    expect(row[0]).toBe(7);
    expect(row[3]).toBe('Laura');
    expect(row[4]).toBe('Martínez');
    expect(row[15]).toBe('activo');
  });

  it('maps missing fields to undefined (which becomes empty in CSV)', () => {
    const sparse = { id: 1, nombre: 'Solo' } as Record<string, unknown>;
    const row = empleadoToRow(sparse);

    expect(row[0]).toBe(1);
    expect(row[3]).toBe('Solo');
    expect(row[1]).toBeUndefined(); // cedula
  });
});

// ─── buildEmployeeCsv ─────────────────────────────────────────────────────────

describe('buildEmployeeCsv', () => {
  it('returns just the header row for an empty array', () => {
    const csv = buildEmployeeCsv([]);
    expect(csv).toBe(toCsvRow(EMPLOYEE_CSV_HEADERS));
    expect(csv.split('\r\n')).toHaveLength(1);
  });

  it('adds one data row per employee separated by CRLF', () => {
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

  it('handles commas inside field values by quoting them', () => {
    const emp = { id: 1, nombre: 'Juan, Carlos', apellido: 'García' } as Record<string, unknown>;
    expect(buildEmployeeCsv([emp])).toContain('"Juan, Carlos"');
  });

  it('produces the correct number of rows for multiple employees', () => {
    const emp1 = { id: 1, nombre: 'Ana' } as Record<string, unknown>;
    const emp2 = { id: 2, nombre: 'Luis' } as Record<string, unknown>;
    const lines = buildEmployeeCsv([emp1, emp2]).split('\r\n');

    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('EMPLOYEE_CSV_HEADERS has exactly 20 columns', () => {
    expect(EMPLOYEE_CSV_HEADERS).toHaveLength(20);
  });
});
