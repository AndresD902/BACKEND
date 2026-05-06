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

      CONSTRAINT "chk_adendas_contratos_contrato_id_positive"
        CHECK ("contrato_id" > 0),
      CONSTRAINT "chk_adendas_contratos_numero_positive"
        CHECK ("numero_adenda" > 0),
      CONSTRAINT "chk_adendas_contratos_descripcion_not_blank"
        CHECK (BTRIM("descripcion") <> ''),
      CONSTRAINT "chk_adendas_contratos_cambios_json_object"
        CHECK ("cambios_json" IS NULL OR jsonb_typeof("cambios_json") = 'object'),
      CONSTRAINT "chk_adendas_contratos_archivo_s3_key_not_blank"
        CHECK ("archivo_s3_key" IS NULL OR BTRIM("archivo_s3_key") <> ''),
      CONSTRAINT "chk_adendas_contratos_archivo_s3_url_not_blank"
        CHECK ("archivo_s3_url" IS NULL OR BTRIM("archivo_s3_url") <> ''),
      CONSTRAINT "chk_adendas_contratos_creado_por_email"
        CHECK (
          "creado_por" IS NULL
          OR (BTRIM("creado_por") <> '' AND POSITION('@' IN "creado_por") > 1)
        ),

      CONSTRAINT "fk_adendas_contratos_contrato"
        FOREIGN KEY ("contrato_id")
        REFERENCES "contratos" ("id")
        ON DELETE RESTRICT,

      CONSTRAINT "uq_adendas_contrato_numero"
        UNIQUE ("contrato_id", "numero_adenda")
    );

    CREATE INDEX "idx_adendas_contrato_id"
      ON "adendas_contratos" ("contrato_id");

    CREATE INDEX "idx_adendas_fecha_vigencia"
      ON "adendas_contratos" ("fecha_vigencia" DESC);

    CREATE INDEX "idx_adendas_creado_por"
      ON "adendas_contratos" ("creado_por");

    COMMENT ON TABLE "adendas_contratos"
      IS 'Adendas de contratos; history-service audita cambios usando entidad=contrato y entidad_id=contrato_id.';
    COMMENT ON COLUMN "adendas_contratos"."contrato_id"
      IS 'Referencia interna a contract-service.contratos.id.';
    COMMENT ON COLUMN "adendas_contratos"."creado_por"
      IS 'Email del usuario autenticado por auth-service que registro la adenda.';
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS "adendas_contratos";
  `);
};
