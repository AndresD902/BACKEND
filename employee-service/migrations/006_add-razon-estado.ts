import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.addColumn('empleados', {
    razon_estado: { type: 'varchar(100)' },
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropColumn('empleados', 'razon_estado');
};
