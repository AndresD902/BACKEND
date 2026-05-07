import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('admins_empresa', {
    id:          { type: 'BIGSERIAL', primaryKey: true },
    empresa_id:  { type: 'BIGINT', notNull: true, references: '"empresas"(id)', onDelete: 'CASCADE' },
    email:       { type: 'VARCHAR(150)', notNull: true },
    nombre:      { type: 'VARCHAR(100)' },
    activo:      { type: 'BOOLEAN', notNull: true, default: true },
    creado_en:   { type: 'TIMESTAMP(6)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('admins_empresa', ['empresa_id', 'activo'], { name: 'idx_admins_empresa_activo' });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('admins_empresa');
};
