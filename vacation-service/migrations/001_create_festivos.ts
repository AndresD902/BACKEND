import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('festivos', {
    id:          { type: 'serial', primaryKey: true },
    fecha:       { type: 'date', notNull: true, unique: true },
    descripcion: { type: 'varchar(150)', notNull: true },
    anio:        { type: 'int', notNull: true },
    tipo:        { type: 'varchar(50)', default: 'nacional' },
    activo:      { type: 'boolean', default: true },
  });

  pgm.addConstraint('festivos', 'chk_tipo_festivo', "CHECK (tipo IN ('nacional', 'regional', 'empresarial'))");
  pgm.createIndex('festivos', ['fecha', 'activo']);
  pgm.createIndex('festivos', ['anio', 'activo']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('festivos');
}
