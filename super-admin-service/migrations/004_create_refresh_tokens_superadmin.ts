import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('refresh_tokens_superadmin', {
    id:             { type: 'BIGSERIAL', primaryKey: true },
    super_admin_id: { type: 'BIGINT', notNull: true, references: '"super_admins"(id)', onDelete: 'CASCADE' },
    token_hash:     { type: 'VARCHAR(255)', notNull: true, unique: true },
    expires_at:     { type: 'TIMESTAMP', notNull: true },
    revocado:       { type: 'BOOLEAN', notNull: true, default: false },
    ip_origen:      { type: 'VARCHAR(50)' },
    user_agent:     { type: 'TEXT' },
    created_at:     { type: 'TIMESTAMP(6)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('refresh_tokens_superadmin', 'token_hash',     { unique: true, name: 'uq_rt_superadmin_hash' });
  pgm.createIndex('refresh_tokens_superadmin', 'super_admin_id', { name: 'idx_rt_superadmin_id' });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('refresh_tokens_superadmin');
};
