import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE empleados
      ADD COLUMN IF NOT EXISTS empresa_id BIGINT;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_empleados_empresa_id
      ON empleados(empresa_id);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS employee_change_requests (
      id BIGSERIAL PRIMARY KEY,
      empleado_id BIGINT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
      empresa_id BIGINT,
      category VARCHAR(80) NOT NULL DEFAULT 'general',
      current_value TEXT,
      requested_value TEXT,
      justification TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      requested_by_email VARCHAR(255),
      reviewed_by VARCHAR(255),
      review_notes TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_employee_change_requests_empresa_status
      ON employee_change_requests(empresa_id, status);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_employee_change_requests_empleado
      ON employee_change_requests(empleado_id);
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql('DROP INDEX IF EXISTS idx_employee_change_requests_empleado;');
  pgm.sql('DROP INDEX IF EXISTS idx_employee_change_requests_empresa_status;');
  pgm.sql('DROP TABLE IF EXISTS employee_change_requests;');
  pgm.sql('DROP INDEX IF EXISTS idx_empleados_empresa_id;');
  pgm.sql('ALTER TABLE empleados DROP COLUMN IF EXISTS empresa_id;');
};
