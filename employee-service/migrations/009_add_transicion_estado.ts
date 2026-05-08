import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TYPE "estado_empleado_enum" ADD VALUE 'transicion';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  // Removing enum value is not straightforward; we can ignore down migration or drop and recreate type with data loss.
  // For simplicity, we will not implement down migration.
  pgm.sql(``);
};