import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('dias_disponibles', {
    id:                  { type: 'serial', primaryKey: true },
    empleado_id:         { type: 'int', notNull: true },
    anio:                { type: 'int', notNull: true },
    dias_totales:        { type: 'decimal(5,1)', notNull: true },
    dias_usados:         { type: 'decimal(5,1)', default: 0 },
    dias_pendientes:     { type: 'decimal(5,1)', default: 0 },
    fecha_creacion:      { type: 'timestamp', default: pgm.func('current_timestamp') },
    fecha_actualizacion: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.sql(`
    ALTER TABLE dias_disponibles
    ADD COLUMN dias_disponibles DECIMAL(5,1)
    GENERATED ALWAYS AS (dias_totales - dias_usados - dias_pendientes) STORED;
  `);

  pgm.addConstraint('dias_disponibles', 'uq_empleado_anio', 'UNIQUE (empleado_id, anio)');
  pgm.createIndex('dias_disponibles', ['empleado_id', 'anio']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('dias_disponibles');
}
