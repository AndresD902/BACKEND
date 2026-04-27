import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE "tipo_salario_enum" AS ENUM ('fijo', 'variable', 'por_hora');

    CREATE TABLE "cargos_salarios" (
      "id"             BIGSERIAL           NOT NULL,
      "empleado_id"    BIGINT              NOT NULL,
      "cargo"          VARCHAR(100)        NOT NULL,
      "departamento"   VARCHAR(100),
      "salario"        DECIMAL(12, 2)      NOT NULL,
      "tipo_salario"   "tipo_salario_enum" NOT NULL DEFAULT 'fijo',
      "fecha_inicio"   DATE                NOT NULL,
      "fecha_fin"      DATE,
      "activo"         BOOLEAN             NOT NULL DEFAULT TRUE,
      "motivo_cambio"  TEXT,
      "registrado_por" VARCHAR(150),
      "created_at"     TIMESTAMP(6)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "cargos_salarios_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "idx_cargos_emp_activo" ON "cargos_salarios"("empleado_id", "activo");
    CREATE INDEX "idx_cargos_emp_fechas" ON "cargos_salarios"("empleado_id", "fecha_inicio" DESC);

    ALTER TABLE "cargos_salarios"
      ADD CONSTRAINT "fk_cargos_empleado"
      FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT;
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS "cargos_salarios";
    DROP TYPE IF EXISTS "tipo_salario_enum";
  `);
};
