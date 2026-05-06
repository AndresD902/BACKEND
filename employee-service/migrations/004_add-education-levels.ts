import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TYPE "nivel_educativo_enum" ADD VALUE IF NOT EXISTS 'especialista';
    ALTER TYPE "nivel_educativo_enum" ADD VALUE IF NOT EXISTS 'magister';
    ALTER TYPE "nivel_educativo_enum" ADD VALUE IF NOT EXISTS 'doctorado';
  `);
};

export const down = (_pgm: MigrationBuilder): void => {
  // PostgreSQL does not support removing values from an ENUM type without recreating it.
  // Downgrade requires manual intervention.
};
