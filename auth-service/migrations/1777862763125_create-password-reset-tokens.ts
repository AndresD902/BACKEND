import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE "password_reset_tokens" (
      "id"          BIGSERIAL     NOT NULL,
      "user_id"     BIGINT        NOT NULL,
      "token_hash"  VARCHAR(255)  NOT NULL,
      "expires_at"  TIMESTAMP(6)  NOT NULL,
      "used"        BOOLEAN       NOT NULL DEFAULT FALSE,
      "created_at"  TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "fk_prt_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX "uq_prt_token_hash" ON "password_reset_tokens"("token_hash");
    CREATE INDEX        "idx_prt_user_id"   ON "password_reset_tokens"("user_id");
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS "password_reset_tokens";`);
}
