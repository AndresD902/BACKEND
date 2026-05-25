import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "company_id" BIGINT,
      ADD COLUMN IF NOT EXISTS "employee_id" BIGINT,
      ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE INDEX IF NOT EXISTS "idx_users_company_role_active"
      ON "users"("company_id", "role", "is_active");

    CREATE INDEX IF NOT EXISTS "idx_users_employee_id"
      ON "users"("employee_id");
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS "idx_users_employee_id";
    DROP INDEX IF EXISTS "idx_users_company_role_active";

    ALTER TABLE "users"
      DROP COLUMN IF EXISTS "must_change_password",
      DROP COLUMN IF EXISTS "employee_id",
      DROP COLUMN IF EXISTS "company_id";
  `);
}
