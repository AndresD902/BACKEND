import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createType('plan_enum', ['basico', 'profesional', 'enterprise']);
  pgm.createType('estado_empresa_enum', ['activa', 'inactiva', 'suspendida']);

  pgm.createTable('empresas', {
    id:         { type: 'BIGSERIAL', primaryKey: true },
    nombre:     { type: 'VARCHAR(150)', notNull: true },
    nit:        { type: 'VARCHAR(20)',  notNull: true, unique: true },
    correo:     { type: 'VARCHAR(150)', notNull: true },
    telefono:   { type: 'VARCHAR(20)' },
    plan:       { type: 'plan_enum',          notNull: true, default: 'basico' },
    estado:     { type: 'estado_empresa_enum', notNull: true, default: 'activa' },
    created_at: { type: 'TIMESTAMP(6)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP(6)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('empresas', 'nit',    { unique: true, name: 'uq_empresas_nit' });
  pgm.createIndex('empresas', 'estado', { name: 'idx_empresas_estado' });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('empresas');
  pgm.dropType('estado_empresa_enum');
  pgm.dropType('plan_enum');
};
