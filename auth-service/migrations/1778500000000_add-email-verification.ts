import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('users', {
    email_verified: { type: 'boolean', notNull: true, default: true },
  });

  pgm.createTable('email_verifications', {
    id:         { type: 'bigserial', primaryKey: true },
    user_id:    { type: 'bigint', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    token_hash: { type: 'varchar(255)', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used:       { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('email_verifications', 'user_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('email_verifications');
  pgm.dropColumn('users', 'email_verified');
}
