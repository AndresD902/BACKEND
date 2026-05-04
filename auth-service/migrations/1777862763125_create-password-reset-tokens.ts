import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('password_reset_tokens', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id:    { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    token_hash: { type: 'varchar(255)', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used:       { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createIndex('password_reset_tokens', 'user_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('password_reset_tokens');
}
