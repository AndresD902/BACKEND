import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('super_admins', {
    id:                  { type: 'BIGSERIAL', primaryKey: true },
    nombre:              { type: 'VARCHAR(100)', notNull: true },
    email:               { type: 'VARCHAR(150)', notNull: true, unique: true },
    password_hash:       { type: 'VARCHAR(255)', notNull: true },
    activo:              { type: 'BOOLEAN', notNull: true, default: true },
    ultimo_login:        { type: 'TIMESTAMP' },
    reset_token:         { type: 'VARCHAR(255)' },
    reset_token_expires: { type: 'TIMESTAMP' },
    created_at:          { type: 'TIMESTAMP(6)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at:          { type: 'TIMESTAMP(6)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('super_admins', 'email', { unique: true, name: 'uq_super_admins_email' });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('super_admins');
};
