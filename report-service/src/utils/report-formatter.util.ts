// Minimal CSV serializer — no external dependencies.
// Handles quoting, commas and newlines within field values.

function escapeField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(fields: unknown[]): string {
  return fields.map(escapeField).join(',');
}

export const EMPLOYEE_CSV_HEADERS = [
  'ID', 'Cédula', 'Tipo Documento', 'Nombre', 'Apellido', 'Género',
  'Fecha Nacimiento', 'Celular', 'Teléfono Fijo', 'Correo Personal',
  'Correo Corporativo', 'Dirección', 'Ciudad', 'Departamento',
  'Nivel Educativo', 'Estado', 'Razón Estado',
  'Fecha Ingreso', 'Fecha Retiro', 'Creado En',
];

export function empleadoToRow(emp: Record<string, unknown>): unknown[] {
  return [
    emp['id'],
    emp['cedula'],
    emp['tipo_documento'],
    emp['nombre'],
    emp['apellido'],
    emp['genero'],
    emp['fecha_nacimiento'],
    emp['celular'],
    emp['telefono_fijo'],
    emp['correo_personal'],
    emp['correo_corporativo'],
    emp['direccion'],
    emp['ciudad'],
    emp['departamento'],
    emp['nivel_educativo'],
    emp['estado'],
    emp['razon_estado'],
    emp['fecha_ingreso'],
    emp['fecha_retiro'],
    emp['created_at'],
  ];
}

export function buildEmployeeCsv(empleados: Record<string, unknown>[]): string {
  const lines: string[] = [toCsvRow(EMPLOYEE_CSV_HEADERS)];
  for (const emp of empleados) {
    lines.push(toCsvRow(empleadoToRow(emp)));
  }
  return lines.join('\r\n');
}
