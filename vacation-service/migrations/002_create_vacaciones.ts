import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('vacaciones', {
    id:                  { type: 'serial', primaryKey: true },
    empleado_id:         { type: 'int', notNull: true },
    fecha_inicio:        { type: 'date', notNull: true },
    fecha_fin:           { type: 'date', notNull: true },
    dias_habiles:        { type: 'int', notNull: true },
    dias_calendario:     { type: 'int', notNull: true },
    estado:              { type: 'varchar(20)', default: 'pendiente' },
    justificacion:       { type: 'text' },
    motivo_rechazo:      { type: 'text' },
    aprobado_por:        { type: 'varchar(150)' },
    fecha_aprobacion:    { type: 'timestamp' },
    notificado:          { type: 'boolean', default: false },
    fecha_solicitud:     { type: 'timestamp', default: pgm.func('current_timestamp') },
    fecha_actualizacion: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint(
    'vacaciones',
    'chk_estado_vac',
    "CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada'))",
  );
  pgm.createIndex('vacaciones', ['empleado_id', 'estado']);
  pgm.createIndex('vacaciones', ['fecha_inicio', 'fecha_fin']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('vacaciones');
}
