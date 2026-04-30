import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE "acciones_sistema" (
      "id"            BIGSERIAL    NOT NULL,
      "usuario_email" VARCHAR(150),
      "rol"           VARCHAR(50),
      "accion"        VARCHAR(100) NOT NULL,
      "entidad"       VARCHAR(50),
      "entidad_id"    INT,
      "resultado"     VARCHAR(20)  NOT NULL DEFAULT 'exitoso'
                      CHECK ("resultado" IN ('exitoso', 'fallido', 'denegado')),
      "detalle"       TEXT,
      "ip_origen"     VARCHAR(45),
      "user_agent"    TEXT,
      "fecha"         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "acciones_sistema_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX "idx_acciones_usuario" ON "acciones_sistema"("usuario_email", "fecha" DESC);
    CREATE INDEX "idx_acciones_accion"  ON "acciones_sistema"("accion", "resultado");
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TABLE IF EXISTS "acciones_sistema";`);
};
