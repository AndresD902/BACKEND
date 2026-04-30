import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE "historial_cambios" (
      "id"                  BIGSERIAL    NOT NULL,
      "empleado_id"         INT          NOT NULL,
      "entidad"             VARCHAR(50)  NOT NULL,
      "entidad_id"          INT,
      "campo_modificado"    VARCHAR(100) NOT NULL,
      "valor_anterior"      TEXT,
      "valor_nuevo"         TEXT,
      "usuario_modificador" VARCHAR(150) NOT NULL,
      "rol_modificador"     VARCHAR(50),
      "ip_origen"           VARCHAR(45),
      "fecha_modificacion"  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "historial_cambios_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "idx_historial_empleado_id" ON "historial_cambios"("empleado_id", "fecha_modificacion" DESC);
    CREATE INDEX "idx_historial_entidad"     ON "historial_cambios"("entidad", "entidad_id");
    CREATE INDEX "idx_historial_usuario"     ON "historial_cambios"("usuario_modificador");
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS "historial_cambios";`);
};
