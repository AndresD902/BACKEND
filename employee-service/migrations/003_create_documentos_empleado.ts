import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE "tipo_documento_s3_enum" AS ENUM (
      'foto', 'hoja_vida', 'certificado', 'diploma', 'contrato_firmado', 'otro'
    );

    CREATE TABLE "documentos_empleado" (
      "id"             BIGSERIAL                   NOT NULL,
      "empleado_id"    BIGINT                      NOT NULL,
      "tipo"           "tipo_documento_s3_enum"    NOT NULL,
      "nombre_archivo" VARCHAR(255),
      "s3_key"         TEXT                        NOT NULL,
      "s3_url"         TEXT                        NOT NULL,
      "mime_type"      VARCHAR(100),
      "tamano_bytes"   BIGINT,
      "activo"         BOOLEAN                     NOT NULL DEFAULT TRUE,
      "subido_por"     VARCHAR(150),
      "created_at"     TIMESTAMP(6)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "documentos_empleado_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "idx_docs_emp_tipo_activo" ON "documentos_empleado"("empleado_id", "tipo", "activo");
    CREATE INDEX "idx_docs_emp_id"          ON "documentos_empleado"("empleado_id");

    ALTER TABLE "documentos_empleado"
      ADD CONSTRAINT "fk_documentos_empleado"
      FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE;
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS "documentos_empleado";
    DROP TYPE IF EXISTS "tipo_documento_s3_enum";
  `);
};
