import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('users', 'notif_login', { default: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('users', 'notif_login', { default: false });
}
