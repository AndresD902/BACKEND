import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE "refresh_tokens" (
      "id"          BIGSERIAL     NOT NULL,
      "user_id"     BIGINT        NOT NULL,
      "token_hash"  VARCHAR(255)  NOT NULL,
      "expires_at"  TIMESTAMP(6)  NOT NULL,
      "revoked"     BOOLEAN       NOT NULL DEFAULT FALSE,
      "ip_origin"   VARCHAR(45),
      "user_agent"  TEXT,
      "created_at"  TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "fk_refresh_tokens_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX "uq_refresh_tokens_hash"      ON "refresh_tokens"("token_hash");
    CREATE INDEX        "idx_refresh_tokens_user_id"  ON "refresh_tokens"("user_id");
    CREATE INDEX        "idx_refresh_tokens_hash"     ON "refresh_tokens"("token_hash");
    CREATE INDEX        "idx_refresh_tokens_revoked"  ON "refresh_tokens"("revoked", "expires_at");
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS "refresh_tokens";`);
};
