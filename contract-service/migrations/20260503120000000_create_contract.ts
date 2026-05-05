
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
      "fecha_actualizacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX "idx_contratos_empleado_estado"
      ON "contratos" ("empleado_id", "estado");

    CREATE INDEX "idx_contratos_fecha_inicio"
      ON "contratos" ("fecha_inicio" DESC);
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS "contratos";
  `);
};
