import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE "users" (
      "id"            BIGSERIAL     NOT NULL,
      "first_name"    VARCHAR(100)  NOT NULL,
      "last_name"     VARCHAR(100)  NOT NULL,
      "email"         VARCHAR(150)  NOT NULL,
      "password_hash" VARCHAR(255)  NOT NULL,
      "role"          VARCHAR(20)   NOT NULL
                      CHECK (role IN ('ADMIN', 'HR', 'CONSULTATION')),
      "is_active"     BOOLEAN       NOT NULL DEFAULT TRUE,
      "last_login"    TIMESTAMP(6),
      "created_at"    TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at"    TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "users_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "uq_users_email"      ON "users"("email");
    CREATE INDEX        "idx_users_is_active" ON "users"("is_active");
    CREATE INDEX        "idx_users_role"      ON "users"("role");
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS "users";`);
}
