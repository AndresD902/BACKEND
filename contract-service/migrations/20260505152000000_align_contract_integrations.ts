type MigrationBuilder = {
  sql: (statement: string) => void;
};

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_empleado_id_positive') THEN
        ALTER TABLE "contratos"
          ADD CONSTRAINT "chk_contratos_empleado_id_positive"
          CHECK ("empleado_id" > 0);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_fecha_fin') THEN
        ALTER TABLE "contratos"
          ADD CONSTRAINT "chk_contratos_fecha_fin"
          CHECK ("fecha_fin" IS NULL OR "fecha_fin" >= "fecha_inicio");
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_moneda_not_blank') THEN
        ALTER TABLE "contratos"
          ADD CONSTRAINT "chk_contratos_moneda_not_blank"
          CHECK (BTRIM("moneda") <> '');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_lugar_trabajo_not_blank') THEN
        ALTER TABLE "contratos"
          ADD CONSTRAINT "chk_contratos_lugar_trabajo_not_blank"
          CHECK ("lugar_trabajo" IS NULL OR BTRIM("lugar_trabajo") <> '');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_archivo_s3_key_not_blank') THEN
        ALTER TABLE "contratos"
          ADD CONSTRAINT "chk_contratos_archivo_s3_key_not_blank"
          CHECK ("archivo_s3_key" IS NULL OR BTRIM("archivo_s3_key") <> '');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_archivo_s3_url_not_blank') THEN
        ALTER TABLE "contratos"
          ADD CONSTRAINT "chk_contratos_archivo_s3_url_not_blank"
          CHECK ("archivo_s3_url" IS NULL OR BTRIM("archivo_s3_url") <> '');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contratos_creado_por_email') THEN
        ALTER TABLE "contratos"
          ADD CONSTRAINT "chk_contratos_creado_por_email"
          CHECK (
            "creado_por" IS NULL
            OR (BTRIM("creado_por") <> '' AND POSITION('@' IN "creado_por") > 1)
          );
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adendas_contratos_contrato_id_positive') THEN
        ALTER TABLE "adendas_contratos"
          ADD CONSTRAINT "chk_adendas_contratos_contrato_id_positive"
          CHECK ("contrato_id" > 0);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adendas_contratos_numero_positive') THEN
        ALTER TABLE "adendas_contratos"
          ADD CONSTRAINT "chk_adendas_contratos_numero_positive"
          CHECK ("numero_adenda" > 0);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adendas_contratos_descripcion_not_blank') THEN
        ALTER TABLE "adendas_contratos"
          ADD CONSTRAINT "chk_adendas_contratos_descripcion_not_blank"
          CHECK (BTRIM("descripcion") <> '');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adendas_contratos_cambios_json_object') THEN
        ALTER TABLE "adendas_contratos"
          ADD CONSTRAINT "chk_adendas_contratos_cambios_json_object"
          CHECK ("cambios_json" IS NULL OR jsonb_typeof("cambios_json") = 'object');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adendas_contratos_archivo_s3_key_not_blank') THEN
        ALTER TABLE "adendas_contratos"
          ADD CONSTRAINT "chk_adendas_contratos_archivo_s3_key_not_blank"
          CHECK ("archivo_s3_key" IS NULL OR BTRIM("archivo_s3_key") <> '');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adendas_contratos_archivo_s3_url_not_blank') THEN
        ALTER TABLE "adendas_contratos"
          ADD CONSTRAINT "chk_adendas_contratos_archivo_s3_url_not_blank"
          CHECK ("archivo_s3_url" IS NULL OR BTRIM("archivo_s3_url") <> '');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adendas_contratos_creado_por_email') THEN
        ALTER TABLE "adendas_contratos"
          ADD CONSTRAINT "chk_adendas_contratos_creado_por_email"
          CHECK (
            "creado_por" IS NULL
            OR (BTRIM("creado_por") <> '' AND POSITION('@' IN "creado_por") > 1)
          );
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "uq_contratos_empleado_activo"
      ON "contratos" ("empleado_id")
      WHERE "estado" = 'activo';

    CREATE INDEX IF NOT EXISTS "idx_contratos_estado"
      ON "contratos" ("estado");

    CREATE INDEX IF NOT EXISTS "idx_contratos_creado_por"
      ON "contratos" ("creado_por");

    CREATE INDEX IF NOT EXISTS "idx_adendas_fecha_vigencia"
      ON "adendas_contratos" ("fecha_vigencia" DESC);

    CREATE INDEX IF NOT EXISTS "idx_adendas_creado_por"
      ON "adendas_contratos" ("creado_por");

    COMMENT ON TABLE "contratos"
      IS 'Contratos laborales por empleado; history-service audita cambios usando entidad=contrato y entidad_id=id.';
    COMMENT ON COLUMN "contratos"."empleado_id"
      IS 'Referencia logica a employee-service.empleados.id; se valida via REST antes de crear el contrato.';
    COMMENT ON COLUMN "contratos"."creado_por"
      IS 'Email del usuario autenticado por auth-service que creo o modifico el registro.';
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
    DROP INDEX IF EXISTS "idx_adendas_creado_por";
    DROP INDEX IF EXISTS "idx_adendas_fecha_vigencia";
    DROP INDEX IF EXISTS "idx_contratos_creado_por";
    DROP INDEX IF EXISTS "idx_contratos_estado";
    DROP INDEX IF EXISTS "uq_contratos_empleado_activo";

    ALTER TABLE "adendas_contratos"
      DROP CONSTRAINT IF EXISTS "chk_adendas_contratos_creado_por_email",
      DROP CONSTRAINT IF EXISTS "chk_adendas_contratos_archivo_s3_url_not_blank",
      DROP CONSTRAINT IF EXISTS "chk_adendas_contratos_archivo_s3_key_not_blank",
      DROP CONSTRAINT IF EXISTS "chk_adendas_contratos_cambios_json_object",
      DROP CONSTRAINT IF EXISTS "chk_adendas_contratos_descripcion_not_blank",
      DROP CONSTRAINT IF EXISTS "chk_adendas_contratos_numero_positive",
      DROP CONSTRAINT IF EXISTS "chk_adendas_contratos_contrato_id_positive";

    ALTER TABLE "contratos"
      DROP CONSTRAINT IF EXISTS "chk_contratos_creado_por_email",
      DROP CONSTRAINT IF EXISTS "chk_contratos_archivo_s3_url_not_blank",
      DROP CONSTRAINT IF EXISTS "chk_contratos_archivo_s3_key_not_blank",
      DROP CONSTRAINT IF EXISTS "chk_contratos_lugar_trabajo_not_blank",
      DROP CONSTRAINT IF EXISTS "chk_contratos_moneda_not_blank",
      DROP CONSTRAINT IF EXISTS "chk_contratos_fecha_fin",
      DROP CONSTRAINT IF EXISTS "chk_contratos_empleado_id_positive";

    COMMENT ON TABLE "contratos" IS NULL;
    COMMENT ON COLUMN "contratos"."empleado_id" IS NULL;
    COMMENT ON COLUMN "contratos"."creado_por" IS NULL;
    COMMENT ON TABLE "adendas_contratos" IS NULL;
    COMMENT ON COLUMN "adendas_contratos"."contrato_id" IS NULL;
    COMMENT ON COLUMN "adendas_contratos"."creado_por" IS NULL;
  `);
};
