import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TYPE "tipo_documento_enum" AS ENUM (
      'cedula_ciudadania', 'cedula_extranjeria', 'pasaporte', 'tarjeta_identidad'
    );

    CREATE TYPE "genero_enum" AS ENUM (
      'masculino', 'femenino', 'otro', 'prefiero_no_decir'
    );

    CREATE TYPE "estado_empleado_enum" AS ENUM (
      'activo', 'inactivo', 'vacaciones', 'licencia', 'retirado'
    );

    CREATE TYPE "nivel_educativo_enum" AS ENUM (
      'bachiller', 'tecnico', 'tecnologo', 'universitario', 'posgrado'
    );

    CREATE TABLE "empleados" (
      "id"                  BIGSERIAL                   NOT NULL,
      "cedula"              VARCHAR(20)                 NOT NULL,
      "tipo_documento"      "tipo_documento_enum"       NOT NULL DEFAULT 'cedula_ciudadania',
      "nombre"              VARCHAR(100)                NOT NULL,
      "apellido"            VARCHAR(100)                NOT NULL,
      "genero"              "genero_enum",
      "fecha_nacimiento"    DATE,
      "celular"             VARCHAR(20),
      "telefono_fijo"       VARCHAR(20),
      "correo_personal"     VARCHAR(150),
      "correo_corporativo"  VARCHAR(150)                NOT NULL,
      "direccion"           TEXT,
      "ciudad"              VARCHAR(100),
      "departamento"        VARCHAR(100),
      "nivel_educativo"     "nivel_educativo_enum",
      "estado"              "estado_empleado_enum"      NOT NULL DEFAULT 'activo',
      "fecha_ingreso"       DATE,
      "fecha_retiro"        DATE,
      "created_at"          TIMESTAMP(6)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at"          TIMESTAMP(6)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "uq_empleados_cedula"      ON "empleados"("cedula");
    CREATE UNIQUE INDEX "uq_empleados_correo_corp" ON "empleados"("correo_corporativo");
    CREATE INDEX        "idx_empleados_cedula"      ON "empleados"("cedula");
    CREATE INDEX        "idx_empleados_estado"      ON "empleados"("estado");
    CREATE INDEX        "idx_empleados_correo_corp" ON "empleados"("correo_corporativo");
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS "empleados";
    DROP TYPE IF EXISTS "nivel_educativo_enum";
    DROP TYPE IF EXISTS "estado_empleado_enum";
    DROP TYPE IF EXISTS "genero_enum";
    DROP TYPE IF EXISTS "tipo_documento_enum";
  `);
};
