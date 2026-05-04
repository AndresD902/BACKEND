import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('users', {
    notif_login: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    notif_cambios: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('users', ['notif_login', 'notif_cambios']);
}
