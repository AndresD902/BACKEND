import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('departamentos_cargo', {
    id:          { type: 'serial', primaryKey: true },
    nombre:      { type: 'varchar(100)', notNull: true, unique: true },
    descripcion: { type: 'varchar(255)' },
    created_at:  { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at:  { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('departamentos_cargo');
};
