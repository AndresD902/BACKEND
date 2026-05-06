
type MigrationBuilder = {
  sql: (statement: string) => void;
};

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE "contratos" (
      "id" BIGSERIAL PRIMARY KEY,
      "empleado_id" BIGINT NOT NULL,
      "tipo" VARCHAR(50) NOT NULL CHECK (
        "tipo" IN ('indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'prestacion_servicios')
      ),
      "salario" DECIMAL(12, 2) NOT NULL CHECK ("salario" > 0),
      "moneda" VARCHAR(10) NOT NULL DEFAULT 'COP',
      "fecha_inicio" DATE NOT NULL,
      "fecha_fin" DATE,
      "metodo_pago" VARCHAR(50) CHECK (
        "metodo_pago" IN ('transferencia', 'cheque', 'efectivo')
      ),
      "periodicidad_pago" VARCHAR(50) CHECK (
        "periodicidad_pago" IN ('mensual', 'quincenal', 'semanal')
      ),
      "lugar_trabajo" VARCHAR(150),
      "modalidad" VARCHAR(50) NOT NULL DEFAULT 'presencial' CHECK (
        "modalidad" IN ('presencial', 'remoto', 'hibrido')
      ),
      "jornada" VARCHAR(50) NOT NULL DEFAULT 'completa' CHECK (
        "jornada" IN ('completa', 'medio_tiempo', 'flexible')
      ),
      "archivo_s3_key" TEXT,
      "archivo_s3_url" TEXT,
      "estado" VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (
        "estado" IN ('activo', 'vencido', 'terminado', 'suspendido')
      ),
      "creado_por" VARCHAR(150),
      "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "chk_contratos_empleado_id_positive"
        CHECK ("empleado_id" > 0),
      CONSTRAINT "chk_contratos_fecha_fin"
        CHECK ("fecha_fin" IS NULL OR "fecha_fin" >= "fecha_inicio"),
      CONSTRAINT "chk_contratos_moneda_not_blank"
        CHECK (BTRIM("moneda") <> ''),
      CONSTRAINT "chk_contratos_lugar_trabajo_not_blank"
        CHECK ("lugar_trabajo" IS NULL OR BTRIM("lugar_trabajo") <> ''),
      CONSTRAINT "chk_contratos_archivo_s3_key_not_blank"
        CHECK ("archivo_s3_key" IS NULL OR BTRIM("archivo_s3_key") <> ''),
      CONSTRAINT "chk_contratos_archivo_s3_url_not_blank"
        CHECK ("archivo_s3_url" IS NULL OR BTRIM("archivo_s3_url") <> ''),
      CONSTRAINT "chk_contratos_creado_por_email"
        CHECK (
          "creado_por" IS NULL
          OR (BTRIM("creado_por") <> '' AND POSITION('@' IN "creado_por") > 1)
        )
    );

    COMMENT ON COLUMN "contratos"."empleado_id"
      IS 'Referencia logica a employee-service.empleados.id; se valida via REST antes de crear el contrato.';
    COMMENT ON COLUMN "contratos"."creado_por"
      IS 'Email del usuario autenticado por auth-service que creo o modifico el registro.';
    COMMENT ON TABLE "contratos"
      IS 'Contratos laborales por empleado; history-service audita cambios usando entidad=contrato y entidad_id=id.';

    CREATE UNIQUE INDEX "uq_contratos_empleado_activo"
      ON "contratos" ("empleado_id")
      WHERE "estado" = 'activo';

    CREATE INDEX "idx_contratos_empleado_estado"
      ON "contratos" ("empleado_id", "estado");

    CREATE INDEX "idx_contratos_estado"
      ON "contratos" ("estado");

    CREATE INDEX "idx_contratos_fecha_inicio"
      ON "contratos" ("fecha_inicio" DESC);

    CREATE INDEX "idx_contratos_creado_por"
      ON "contratos" ("creado_por");
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS "contratos";
  `);
};
