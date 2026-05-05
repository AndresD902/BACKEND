type MigrationBuilder = {
  sql: (statement: string) => void;
};

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE "adendas_contratos" (
      "id" BIGSERIAL PRIMARY KEY,
      "contrato_id" BIGINT NOT NULL,
      "numero_adenda" INT NOT NULL,
      "descripcion" TEXT NOT NULL,
      "cambios_json" JSONB,
      "archivo_s3_key" TEXT,
      "archivo_s3_url" TEXT,
      "fecha_vigencia" DATE NOT NULL,
      "creado_por" VARCHAR(150),
      "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "fk_adendas_contratos_contrato"
        FOREIGN KEY ("contrato_id")
        REFERENCES "contratos" ("id")
        ON DELETE RESTRICT,

      CONSTRAINT "uq_adendas_contrato_numero"
        UNIQUE ("contrato_id", "numero_adenda")
    );

    CREATE INDEX "idx_adendas_contrato_id"
      ON "adendas_contratos" ("contrato_id");
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS "adendas_contratos";
  `);
};
