# 🏖️ vacation-service — README

> Microservicio 4 del sistema HR · Node.js + Express + PostgreSQL · Puerto 3004

---

## Tabla de Contenido

1. [Descripción General](#1-descripción-general)
2. [Responsabilidades](#2-responsabilidades)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estructura de Carpetas](#4-estructura-de-carpetas)
5. [Modelo de Datos](#5-modelo-de-datos)
6. [Migraciones](#6-migraciones)
7. [Variables de Entorno](#7-variables-de-entorno)
8. [API REST — Endpoints](#8-api-rest--endpoints)
9. [Reglas de Negocio](#9-reglas-de-negocio)
10. [Flujos Internos](#10-flujos-internos)
11. [Lógica Interna — Servicios](#11-lógica-interna--servicios)
12. [Comunicación con otros microservicios](#12-comunicación-con-otros-microservicios)
13. [Casos de Prueba](#13-casos-de-prueba)
14. [Prueba de Estrés con k6](#14-prueba-de-estrés-con-k6)
15. [Docker y ejecución local](#15-docker-y-ejecución-local)
16. [Seguridad](#16-seguridad)

---

## 1. Descripción General

El `vacation-service` gestiona todo el ciclo de vida de las solicitudes de vacaciones de los empleados. Es el único microservicio del sistema que combina lógica de calendario colombiano (festivos en BD), cálculo de días hábiles, gestión de disponibilidad por año y notificaciones por correo real.

**No tiene dependencia directa de base de datos con otros servicios.** Las referencias a `empleado_id` son lógicas: se validan opcionalmente via HTTP REST al Employee Service.

---

## 2. Responsabilidades

- Gestionar solicitudes de vacaciones con validaciones estrictas de negocio.
- Calcular días hábiles excluyendo fines de semana y festivos almacenados en la tabla `festivos`.
- Mantener actualizada la tabla `dias_disponibles` por empleado por año (fuente de verdad de cuántos días le quedan a cada empleado).
- Crear automáticamente el registro de `dias_disponibles` para el año actual cuando se solicita por primera vez.
- Enviar correos reales a RRHH al crear una solicitud (Nodemailer + SMTP).
- Enviar correo de confirmación o rechazo cuando RRHH responde.
- Notificar al History Service en cada evento: solicitud, aprobación, rechazo.
- Proveer endpoints públicos de consulta de festivos por año.

---

## 3. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18.x |
| Framework | Express 4.x |
| Base de datos | PostgreSQL 15 |
| Migraciones | node-pg-migrate |
| ORM / Query | pg (node-postgres) — sin ORM |
| Correos | Nodemailer + SMTP (Gmail o SendGrid) |
| Autenticación | JWT — validación local con middleware `verifyToken` |
| Contenedor | Docker + Docker Compose |
| Testing unitario | Jest + Supertest |
| Testing E2E / API | Playwright |
| Performance | Grafana k6 |

---

## 4. Estructura de Carpetas

```
vacation-service/
│
├── src/
│   ├── index.js                              ← Entry point: Express app + puerto
│   │
│   ├── routes/
│   │   └── vacation.routes.js                ← Define todos los endpoints del servicio
│   │
│   ├── controllers/
│   │   └── vacation.controller.js            ← Recibe req/res, llama al service, retorna respuesta
│   │
│   ├── services/
│   │   ├── vacation.service.js               ← Orquesta los flujos principales
│   │   ├── businessRules.service.js          ← Cálculo de días hábiles y todas las validaciones
│   │   ├── diasDisponibles.service.js        ← Lógica de obtener/crear/actualizar dias_disponibles
│   │   └── email.service.js                  ← Nodemailer: envío de correos a RRHH
│   │
│   ├── repositories/
│   │   ├── vacation.repository.js            ← CRUD sobre tabla vacaciones
│   │   ├── diasDisponibles.repository.js     ← CRUD sobre tabla dias_disponibles
│   │   └── festivos.repository.js            ← Consultas sobre tabla festivos
│   │
│   ├── middlewares/
│   │   └── verifyToken.js                    ← Valida JWT localmente (copia del auth-service)
│   │
│   ├── clients/
│   │   └── historyServiceClient.js           ← HTTP fire-and-forget al History Service
│   │
│   └── config/
│       └── db.js                             ← Conexión a PostgreSQL con pg.Pool
│
├── migrations/
│   ├── 001_create_festivos.js
│   ├── 002_create_vacaciones.js
│   ├── 003_create_dias_disponibles.js
│   └── 004_seed_festivos_2025.js             ← 18 festivos colombianos 2025
│
├── tests/
│   ├── unit/
│   │   └── businessRules.test.js             ← Jest: validaciones de negocio aisladas
│   └── integration/
│       └── vacations.api.spec.ts             ← Playwright API Testing
│
├── Dockerfile
├── .env.example
├── .env                                      ← NO subir al repo (en .gitignore)
└── package.json
```

---

## 5. Modelo de Datos

Base de datos: `vacation_db` · 3 tablas

---

### Tabla 1: `vacaciones`

Registra cada solicitud de vacaciones. Una solicitud nace en estado `pendiente` y transita a `aprobada`, `rechazada` o `cancelada`.

```sql
CREATE TABLE vacaciones (
    id               SERIAL PRIMARY KEY,
    empleado_id      INT NOT NULL,
    -- empleado_id es referencia lógica, NO tiene FK real.
    -- Se valida opcionalmente via REST al Employee Service.

    fecha_inicio     DATE NOT NULL,
    fecha_fin        DATE NOT NULL,
    dias_habiles     INT NOT NULL,
    -- Calculado automáticamente en el service excluyendo festivos y fines de semana.

    dias_calendario  INT NOT NULL,
    -- Diferencia simple: fecha_fin - fecha_inicio + 1 (días corridos).

    estado           VARCHAR(20) DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),

    justificacion    TEXT,
    -- Motivo opcional que da el solicitante al pedir las vacaciones.

    motivo_rechazo   TEXT,
    -- Solo se llena cuando RRHH rechaza. Requerido en el flujo de rechazo.

    aprobado_por     VARCHAR(150),
    -- Email del usuario RRHH/Admin que aprobó o rechazó.

    fecha_aprobacion TIMESTAMP,
    -- Se llena cuando el estado cambia a 'aprobada' o 'rechazada'.

    notificado       BOOLEAN DEFAULT FALSE,
    -- TRUE una vez que se envió el correo a RRHH.

    fecha_solicitud  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_vacaciones_empleado_estado ON vacaciones(empleado_id, estado);
CREATE INDEX idx_vacaciones_fechas          ON vacaciones(fecha_inicio, fecha_fin);
```

---

### Tabla 2: `dias_disponibles`

**Fuente de verdad** de cuántos días de vacaciones tiene disponibles cada empleado por año. Sin esta tabla, calcular disponibilidad requeriría recorrer todas las vacaciones históricas en tiempo real.

```sql
CREATE TABLE dias_disponibles (
    id               SERIAL PRIMARY KEY,
    empleado_id      INT NOT NULL,
    anio             INT NOT NULL,
    -- año calendario: 2024, 2025, 2026...

    dias_totales     DECIMAL(5,1) NOT NULL,
    -- Días legales asignados por año. Por ley colombiana: 15 días hábiles.
    -- Se toma del env: DIAS_LEGALES_ANUALES=15

    dias_usados      DECIMAL(5,1) DEFAULT 0,
    -- Días de vacaciones ya aprobadas y tomadas.

    dias_pendientes  DECIMAL(5,1) DEFAULT 0,
    -- Días en solicitudes con estado='pendiente'. Se reservan hasta que RRHH responda.

    dias_disponibles DECIMAL(5,1) GENERATED ALWAYS AS
                     (dias_totales - dias_usados - dias_pendientes) STORED,
    -- Columna calculada automáticamente por PostgreSQL. No se escribe directamente.

    fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (empleado_id, anio)
    -- Un solo registro por empleado por año.
);

-- Índice
CREATE INDEX idx_dias_disponibles_emp_anio ON dias_disponibles(empleado_id, anio);
```

**Lógica de actualización de `dias_disponibles`:**

| Evento | Operación |
|--------|-----------|
| Solicitud creada (`pendiente`) | `dias_pendientes += dias_habiles` |
| Solicitud aprobada | `dias_usados += dias_habiles` · `dias_pendientes -= dias_habiles` |
| Solicitud rechazada o cancelada | `dias_pendientes -= dias_habiles` |

---

### Tabla 3: `festivos`

Festivos colombianos almacenados en BD. Actualizables sin tocar código ni redesplegar. El seed inicial carga los 18 festivos del año 2025.

```sql
CREATE TABLE festivos (
    id          SERIAL PRIMARY KEY,
    fecha       DATE NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,
    -- Ej: "Día de la Independencia", "Navidad"

    anio        INT NOT NULL,
    tipo        VARCHAR(50) DEFAULT 'nacional'
                CHECK (tipo IN ('nacional', 'regional', 'empresarial')),
    activo      BOOLEAN DEFAULT TRUE
    -- false = festivo desactivado (no afecta el cálculo de días hábiles)
);

-- Índices
CREATE INDEX idx_festivos_fecha ON festivos(fecha, activo);
CREATE INDEX idx_festivos_anio  ON festivos(anio, activo);
```

**Consulta: verificar si una fecha es festivo**
```sql
SELECT EXISTS (
    SELECT 1 FROM festivos
    WHERE fecha = $1 AND activo = TRUE
);
```

**Consulta: días disponibles de un empleado para el año actual**
```sql
SELECT dias_totales, dias_usados, dias_pendientes, dias_disponibles
FROM dias_disponibles
WHERE empleado_id = $1 AND anio = EXTRACT(YEAR FROM CURRENT_DATE);
```

---

## 6. Migraciones

Las migraciones corren automáticamente al levantar el contenedor Docker (script `npm run migrate` antes de `node src/index.js`).

### Archivos de migración

```
migrations/
├── 001_create_festivos.js
├── 002_create_vacaciones.js
├── 003_create_dias_disponibles.js
└── 004_seed_festivos_2025.js
```

### `001_create_festivos.js`

```javascript
exports.up = (pgm) => {
  pgm.createTable('festivos', {
    id:          { type: 'serial', primaryKey: true },
    fecha:       { type: 'date', notNull: true, unique: true },
    descripcion: { type: 'varchar(150)', notNull: true },
    anio:        { type: 'int', notNull: true },
    tipo:        { type: 'varchar(50)', default: "'nacional'" },
    activo:      { type: 'boolean', default: true }
  });
  pgm.addConstraint('festivos', 'chk_tipo_festivo',
    "tipo IN ('nacional', 'regional', 'empresarial')");
  pgm.createIndex('festivos', ['fecha', 'activo']);
  pgm.createIndex('festivos', ['anio', 'activo']);
};
exports.down = (pgm) => { pgm.dropTable('festivos'); };
```

### `002_create_vacaciones.js`

```javascript
exports.up = (pgm) => {
  pgm.createTable('vacaciones', {
    id:                  { type: 'serial', primaryKey: true },
    empleado_id:         { type: 'int', notNull: true },
    fecha_inicio:        { type: 'date', notNull: true },
    fecha_fin:           { type: 'date', notNull: true },
    dias_habiles:        { type: 'int', notNull: true },
    dias_calendario:     { type: 'int', notNull: true },
    estado:              { type: 'varchar(20)', default: "'pendiente'" },
    justificacion:       { type: 'text' },
    motivo_rechazo:      { type: 'text' },
    aprobado_por:        { type: 'varchar(150)' },
    fecha_aprobacion:    { type: 'timestamp' },
    notificado:          { type: 'boolean', default: false },
    fecha_solicitud:     { type: 'timestamp', default: pgm.func('current_timestamp') },
    fecha_actualizacion: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('vacaciones', 'chk_estado_vac',
    "estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')");
  pgm.createIndex('vacaciones', ['empleado_id', 'estado']);
  pgm.createIndex('vacaciones', ['fecha_inicio', 'fecha_fin']);
};
exports.down = (pgm) => { pgm.dropTable('vacaciones'); };
```

### `003_create_dias_disponibles.js`

```javascript
exports.up = (pgm) => {
  pgm.createTable('dias_disponibles', {
    id:                  { type: 'serial', primaryKey: true },
    empleado_id:         { type: 'int', notNull: true },
    anio:                { type: 'int', notNull: true },
    dias_totales:        { type: 'decimal(5,1)', notNull: true },
    dias_usados:         { type: 'decimal(5,1)', default: 0 },
    dias_pendientes:     { type: 'decimal(5,1)', default: 0 },
    fecha_creacion:      { type: 'timestamp', default: pgm.func('current_timestamp') },
    fecha_actualizacion: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  // La columna generada dias_disponibles se agrega como SQL crudo
  pgm.sql(`
    ALTER TABLE dias_disponibles
    ADD COLUMN dias_disponibles DECIMAL(5,1)
    GENERATED ALWAYS AS (dias_totales - dias_usados - dias_pendientes) STORED;
  `);
  pgm.addConstraint('dias_disponibles', 'uq_empleado_anio', 'UNIQUE (empleado_id, anio)');
  pgm.createIndex('dias_disponibles', ['empleado_id', 'anio']);
};
exports.down = (pgm) => { pgm.dropTable('dias_disponibles'); };
```

### `004_seed_festivos_2025.js`

```javascript
exports.up = (pgm) => {
  const festivos = [
    ['2025-01-01', 'Año Nuevo',                               2025],
    ['2025-01-06', 'Reyes Magos',                             2025],
    ['2025-03-24', 'San José (trasladado)',                   2025],
    ['2025-04-17', 'Jueves Santo',                            2025],
    ['2025-04-18', 'Viernes Santo',                           2025],
    ['2025-05-01', 'Día del Trabajo',                         2025],
    ['2025-06-02', 'Ascensión del Señor',                     2025],
    ['2025-06-23', 'Corpus Christi',                          2025],
    ['2025-06-30', 'Sagrado Corazón',                         2025],
    ['2025-07-07', 'San Pedro y San Pablo (trasladado)',       2025],
    ['2025-07-20', 'Grito de Independencia',                  2025],
    ['2025-08-07', 'Batalla de Boyacá',                       2025],
    ['2025-08-18', 'Asunción de la Virgen (trasladado)',      2025],
    ['2025-10-13', 'Día de la Raza (trasladado)',              2025],
    ['2025-11-03', 'Todos los Santos (trasladado)',            2025],
    ['2025-11-17', 'Independencia de Cartagena (trasladado)', 2025],
    ['2025-12-08', 'Inmaculada Concepción',                   2025],
    ['2025-12-25', 'Navidad',                                 2025],
  ];
  festivos.forEach(([fecha, descripcion, anio]) => {
    pgm.sql(`
      INSERT INTO festivos (fecha, descripcion, anio)
      VALUES ('${fecha}', '${descripcion}', ${anio})
      ON CONFLICT (fecha) DO NOTHING;
    `);
  });
};
exports.down = (pgm) => {
  pgm.sql("DELETE FROM festivos WHERE anio = 2025;");
};
```

---

## 7. Variables de Entorno

Archivo: `vacation-service/.env` (copiar desde `.env.example`, nunca subir al repo)

```env
# Servidor
PORT=3004

# Base de datos
DATABASE_URL=postgres://postgres:password@postgres-vacation:5432/vacation_db

# JWT — debe ser idéntico al usado en auth-service y todos los demás servicios
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui

# Comunicación con otros microservicios
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006

# SMTP — correo real a RRHH
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rrhh@empresa.com
SMTP_PASS=app_password_gmail

# URL del frontend (para links en los correos)
FRONTEND_URL=https://hr-system.vercel.app

# Reglas de negocio
DIAS_LEGALES_ANUALES=15
```

> **Nota SMTP:** usar App Password de Gmail (no la contraseña normal). En SendGrid usar API Key como SMTP_PASS.

---

## 8. API REST — Endpoints

Base path: `/api/vacaciones`

Todos los endpoints requieren `Authorization: Bearer <access_token>` en el header.

### Tabla de endpoints

| Método | Endpoint | Descripción | Rol mínimo |
|--------|----------|-------------|------------|
| `GET` | `/empleado/:id` | Listar todas las vacaciones de un empleado | consulta |
| `GET` | `/empleado/:id/disponibles` | Días disponibles del año actual | consulta |
| `POST` | `/` | Crear solicitud de vacaciones | rrhh |
| `PATCH` | `/:id/aprobar` | Aprobar una solicitud pendiente | rrhh |
| `PATCH` | `/:id/rechazar` | Rechazar con motivo obligatorio | rrhh |
| `PATCH` | `/:id/cancelar` | Cancelar una solicitud pendiente | rrhh |
| `GET` | `/festivos/:anio` | Listar festivos de un año | consulta |
| `POST` | `/festivos` | Agregar un festivo manualmente | admin |

---

### `GET /api/vacaciones/empleado/:id`

Retorna todas las vacaciones históricas del empleado, ordenadas por `fecha_solicitud DESC`.

```json
// Response 200
[
  {
    "id": 12,
    "empleado_id": 5,
    "fecha_inicio": "2025-07-01",
    "fecha_fin": "2025-07-11",
    "dias_habiles": 9,
    "dias_calendario": 11,
    "estado": "aprobada",
    "justificacion": "Vacaciones de mitad de año",
    "motivo_rechazo": null,
    "aprobado_por": "rrhh@empresa.com",
    "fecha_aprobacion": "2025-06-01T14:30:00.000Z",
    "notificado": true,
    "fecha_solicitud": "2025-05-28T10:00:00.000Z"
  }
]
```

---

### `GET /api/vacaciones/empleado/:id/disponibles`

Retorna el resumen de días disponibles del año actual para el empleado.

```json
// Response 200
{
  "empleado_id": 5,
  "anio": 2025,
  "dias_totales": 15,
  "dias_usados": 9,
  "dias_pendientes": 0,
  "dias_disponibles": 6
}

// Response 404 — si aún no tiene registro para este año
{ "error": "No se encontró registro de días disponibles para este empleado en 2025" }
```

---

### `POST /api/vacaciones`

Crea una nueva solicitud. Ejecuta todas las validaciones de negocio antes de guardar.

**Body:**
```json
{
  "empleado_id": 5,
  "fecha_inicio": "2025-09-01",
  "fecha_fin": "2025-09-12",
  "justificacion": "Vacaciones de fin de año escolar"
}
```

**Response 201:**
```json
{
  "id": 15,
  "empleado_id": 5,
  "fecha_inicio": "2025-09-01",
  "fecha_fin": "2025-09-12",
  "dias_habiles": 10,
  "dias_calendario": 12,
  "estado": "pendiente",
  "notificado": true,
  "fecha_solicitud": "2025-07-28T09:00:00.000Z"
}
```

**Errores posibles:**
```json
// 400 — menos de 5 días hábiles
{ "error": "Las vacaciones deben ser de mínimo 5 días hábiles" }

// 400 — sin anticipación de 1 mes
{ "error": "La solicitud debe realizarse con al menos 1 mes de anticipación" }

// 400 — sin días disponibles
{ "error": "El empleado solo tiene 3 días disponibles y solicitó 8" }

// 400 — solapamiento con otra solicitud
{ "error": "El empleado ya tiene una solicitud activa que se solapa con estas fechas" }

// 400 — fecha_inicio en fin de semana o festivo
{ "error": "La fecha de inicio no puede ser fin de semana ni festivo" }
```

---

### `PATCH /api/vacaciones/:id/aprobar`

Aprueba una solicitud pendiente. Actualiza `dias_disponibles` automáticamente.

**Body:** vacío (el `aprobado_por` se toma del JWT)

**Response 200:**
```json
{
  "id": 15,
  "estado": "aprobada",
  "aprobado_por": "rrhh@empresa.com",
  "fecha_aprobacion": "2025-07-30T11:00:00.000Z"
}
```

---

### `PATCH /api/vacaciones/:id/rechazar`

Rechaza una solicitud. Libera los días pendientes. El `motivo_rechazo` es **obligatorio**.

**Body:**
```json
{
  "motivo_rechazo": "Período de alta demanda operativa, reagendar para octubre"
}
```

**Response 200:**
```json
{
  "id": 15,
  "estado": "rechazada",
  "motivo_rechazo": "Período de alta demanda operativa, reagendar para octubre",
  "aprobado_por": "rrhh@empresa.com"
}
```

---

### `GET /api/vacaciones/festivos/:anio`

```json
// GET /api/vacaciones/festivos/2025 — Response 200
[
  { "id": 1, "fecha": "2025-01-01", "descripcion": "Año Nuevo", "tipo": "nacional" },
  { "id": 2, "fecha": "2025-01-06", "descripcion": "Reyes Magos", "tipo": "nacional" }
  // ... 18 festivos en total
]
```

---

### `POST /api/vacaciones/festivos`

Solo accesible por rol `admin`.

```json
// Body
{
  "fecha": "2025-03-15",
  "descripcion": "Día de la empresa",
  "anio": 2025,
  "tipo": "empresarial"
}

// Response 201
{ "id": 19, "fecha": "2025-03-15", "descripcion": "Día de la empresa", "tipo": "empresarial" }
```

---

## 9. Reglas de Negocio

Todas las reglas están implementadas en `src/services/businessRules.service.js`. Se validan en ese orden exacto al recibir un `POST /api/vacaciones`.

| # | Regla | Error HTTP | Mensaje |
|---|-------|-----------|---------|
| 1 | `fecha_inicio` debe ser ≥ hoy + 1 mes | 400 | `La solicitud debe realizarse con al menos 1 mes de anticipación` |
| 2 | Días hábiles calculados deben ser ≥ 5 | 400 | `Las vacaciones deben ser de mínimo 5 días hábiles` |
| 3 | El empleado debe tener `dias_disponibles` ≥ días solicitados | 400 | `El empleado solo tiene X días disponibles y solicitó Y` |
| 4 | No puede solaparse con otra solicitud `pendiente` o `aprobada` del mismo empleado | 400 | `El empleado ya tiene una solicitud activa que se solapa con estas fechas` |
| 5 | `fecha_inicio` no puede caer en sábado, domingo ni festivo | 400 | `La fecha de inicio no puede ser fin de semana ni festivo` |

**Cálculo de días hábiles:** se itera día a día entre `fecha_inicio` y `fecha_fin` (inclusive), descartando sábados, domingos y fechas que existan en la tabla `festivos` con `activo = TRUE`.

---

## 10. Flujos Internos

### Flujo completo: Solicitar vacaciones

```
POST /api/vacaciones
  │
  ├─ 1. verifyToken (JWT válido, rol: admin o rrhh)
  │
  ├─ 2. calcularDiasHabiles(fecha_inicio, fecha_fin)
  │      └─ consulta festivos.obtenerPorRango(fecha_inicio, fecha_fin)
  │      └─ itera día a día, descarta sábados/domingos/festivos
  │      └─ retorna: diasHabiles (int), diasCalendario (int)
  │
  ├─ 3. validarAnticipacion(fecha_inicio)
  │      └─ fecha_inicio >= hoy + 1 mes → si no: throw 400
  │
  ├─ 4. validarDiasMinimos(diasHabiles)
  │      └─ diasHabiles >= 5 → si no: throw 400
  │
  ├─ 5. diasDisponibles.obtenerOCrear(empleado_id, anioActual)
  │      └─ busca registro en dias_disponibles para (empleado_id, anio)
  │      └─ si no existe: crea con dias_totales = DIAS_LEGALES_ANUALES
  │
  ├─ 6. validarDisponibilidad(diasHabiles, registro.dias_disponibles)
  │      └─ dias_disponibles >= diasHabiles → si no: throw 400
  │
  ├─ 7. validarSolapamiento(empleado_id, fecha_inicio, fecha_fin)
  │      └─ consulta vacaciones activas del empleado en ese rango
  │      └─ si hay solapamiento: throw 400
  │
  ├─ 8. vacation.repository.create({ empleado_id, fecha_inicio, fecha_fin,
  │                                   diasHabiles, diasCalendario, ... })
  │
  ├─ 9. diasDisponibles.repository.incrementarPendientes(empleado_id, anio, diasHabiles)
  │      → UPDATE: dias_pendientes += diasHabiles
  │
  ├─ 10. email.service.notificarSolicitudRRHH({ ... })
  │       └─ Nodemailer → correo real a RRHH
  │       → UPDATE vacaciones SET notificado = TRUE
  │
  ├─ 11. historyClient.registrarCambio({
  │         empleado_id, tipo_accion: 'solicitud_vacaciones',
  │         entidad: 'vacaciones', entidad_id: solicitud.id,
  │         usuario_modificador: req.usuario.email
  │       })  ← fire-and-forget, no bloquea
  │
  └─ 12. res.status(201).json(solicitud)
```

---

### Flujo: Aprobar vacaciones

```
PATCH /api/vacaciones/:id/aprobar
  │
  ├─ 1. verifyToken (rol: admin o rrhh)
  ├─ 2. vacation.repository.findById(id) → si no existe: 404
  ├─ 3. verificar estado === 'pendiente' → si no: 400 "Solo se pueden aprobar solicitudes pendientes"
  ├─ 4. vacation.repository.updateEstado(id, 'aprobada', req.usuario.email)
  ├─ 5. diasDisponibles.repository.aprobar(empleado_id, anio, diasHabiles)
  │      → UPDATE: dias_usados += diasHabiles, dias_pendientes -= diasHabiles
  ├─ 6. historyClient.registrarCambio({ tipo_accion: 'aprobacion_vacaciones', ... })
  ├─ 7. email.service.notificarAprobacion({ ... })  [opcional]
  └─ 8. res.status(200).json(solicitudActualizada)
```

---

### Flujo: Rechazar vacaciones

```
PATCH /api/vacaciones/:id/rechazar
  │
  ├─ 1. verifyToken (rol: admin o rrhh)
  ├─ 2. vacation.repository.findById(id) → si no existe: 404
  ├─ 3. verificar estado === 'pendiente' → si no: 400
  ├─ 4. verificar que motivo_rechazo viene en el body → si no: 400
  ├─ 5. vacation.repository.updateEstado(id, 'rechazada', req.usuario.email, motivo_rechazo)
  ├─ 6. diasDisponibles.repository.liberarPendientes(empleado_id, anio, diasHabiles)
  │      → UPDATE: dias_pendientes -= diasHabiles
  ├─ 7. historyClient.registrarCambio({ tipo_accion: 'rechazo_vacaciones', ... })
  ├─ 8. email.service.notificarRechazo({ ..., motivo_rechazo })
  └─ 9. res.status(200).json(solicitudActualizada)
```

---

## 11. Lógica Interna — Servicios

### `businessRules.service.js`

```javascript
// src/services/businessRules.service.js
const festivosRepo = require('../repositories/festivos.repository');

const calcularDiasHabiles = async (fechaInicio, fechaFin) => {
  const festivos = await festivosRepo.obtenerPorRango(fechaInicio, fechaFin);
  const fechasFestivos = new Set(festivos.map(f => f.fecha.toISOString().split('T')[0]));

  let diasHabiles = 0;
  const cursor = new Date(fechaInicio);
  while (cursor <= fechaFin) {
    const diaSemana   = cursor.getDay(); // 0=domingo, 6=sábado
    const fechaStr    = cursor.toISOString().split('T')[0];
    const esFestivo   = fechasFestivos.has(fechaStr);
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    if (!esFestivo && !esFinSemana) diasHabiles++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return diasHabiles;
};

const calcularDiasCalendario = (fechaInicio, fechaFin) => {
  const diff = fechaFin.getTime() - fechaInicio.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
};

const validarAnticipacion = (fechaInicio) => {
  const hoy   = new Date();
  const unMes = new Date(hoy);
  unMes.setMonth(unMes.getMonth() + 1);
  if (fechaInicio < unMes)
    throw { status: 400, message: 'La solicitud debe realizarse con al menos 1 mes de anticipación' };
};

const validarDiasMinimos = (diasHabiles) => {
  if (diasHabiles < 5)
    throw { status: 400, message: 'Las vacaciones deben ser de mínimo 5 días hábiles' };
};

const validarDisponibilidad = (diasHabiles, disponibles) => {
  if (diasHabiles > disponibles)
    throw { status: 400,
            message: `El empleado solo tiene ${disponibles} días disponibles y solicitó ${diasHabiles}` };
};

const validarFechaInicioHabil = async (fechaInicio) => {
  const diaSemana = fechaInicio.getDay();
  if (diaSemana === 0 || diaSemana === 6)
    throw { status: 400, message: 'La fecha de inicio no puede ser fin de semana ni festivo' };
  const esFestivo = await festivosRepo.existeFestivo(fechaInicio);
  if (esFestivo)
    throw { status: 400, message: 'La fecha de inicio no puede ser fin de semana ni festivo' };
};

module.exports = {
  calcularDiasHabiles,
  calcularDiasCalendario,
  validarAnticipacion,
  validarDiasMinimos,
  validarDisponibilidad,
  validarFechaInicioHabil
};
```

---

### `email.service.js`

```javascript
// src/services/email.service.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const notificarSolicitudRRHH = async ({ empleadoNombre, fechaInicio, fechaFin, diasHabiles, emailRRHH }) => {
  await transporter.sendMail({
    from:    `"Sistema RRHH" <${process.env.SMTP_USER}>`,
    to:      emailRRHH,
    subject: `Nueva solicitud de vacaciones — ${empleadoNombre}`,
    html: `
      <h2>Nueva solicitud de vacaciones</h2>
      <p><strong>Empleado:</strong> ${empleadoNombre}</p>
      <p><strong>Período:</strong> ${fechaInicio} al ${fechaFin}</p>
      <p><strong>Días hábiles:</strong> ${diasHabiles}</p>
      <p>Tiene <strong>3 días hábiles</strong> para aprobar o rechazar esta solicitud.</p>
      <a href="${process.env.FRONTEND_URL}/vacaciones">Ver solicitud en el sistema</a>
    `
  });
};

const notificarAprobacion = async ({ empleadoNombre, fechaInicio, fechaFin, emailRRHH }) => {
  await transporter.sendMail({
    from:    `"Sistema RRHH" <${process.env.SMTP_USER}>`,
    to:      emailRRHH,
    subject: `Vacaciones aprobadas — ${empleadoNombre}`,
    html: `
      <h2>Solicitud de vacaciones aprobada</h2>
      <p><strong>Empleado:</strong> ${empleadoNombre}</p>
      <p><strong>Período aprobado:</strong> ${fechaInicio} al ${fechaFin}</p>
    `
  });
};

const notificarRechazo = async ({ empleadoNombre, fechaInicio, fechaFin, motivoRechazo, emailRRHH }) => {
  await transporter.sendMail({
    from:    `"Sistema RRHH" <${process.env.SMTP_USER}>`,
    to:      emailRRHH,
    subject: `Solicitud de vacaciones rechazada — ${empleadoNombre}`,
    html: `
      <h2>Solicitud de vacaciones rechazada</h2>
      <p><strong>Empleado:</strong> ${empleadoNombre}</p>
      <p><strong>Período solicitado:</strong> ${fechaInicio} al ${fechaFin}</p>
      <p><strong>Motivo:</strong> ${motivoRechazo}</p>
    `
  });
};

module.exports = { notificarSolicitudRRHH, notificarAprobacion, notificarRechazo };
```

---

### `historyServiceClient.js`

Patrón **fire-and-forget**: el vacation-service no espera respuesta ni falla si el History Service está caído. La operación principal ya se completó antes de llamar al historial.

```javascript
// src/clients/historyServiceClient.js
const axios = require('axios');
const HISTORY_URL = process.env.HISTORY_SERVICE_URL;

const registrarCambio = (datos) =>
  axios.post(`${HISTORY_URL}/api/historial/cambios`, datos, { timeout: 3000 })
    .catch(err => console.error('[HistoryClient] No se pudo registrar cambio:', err.message));

module.exports = { registrarCambio };
```

**Datos que se envían al History Service en cada evento:**

```javascript
// Al solicitar vacaciones
historyClient.registrarCambio({
  empleado_id:         req.body.empleado_id,
  tipo_accion:         'solicitud_vacaciones',
  entidad:             'vacaciones',
  entidad_id:          solicitud.id,
  campo_modificado:    'estado',
  valor_anterior:      null,
  valor_nuevo:         'pendiente',
  usuario_modificador: req.usuario.email,
  rol_modificador:     req.usuario.rol,
  ip_origen:           req.ip,
  user_agent:          req.headers['user-agent']
});

// Al aprobar
historyClient.registrarCambio({
  empleado_id:         vacacion.empleado_id,
  tipo_accion:         'aprobacion_vacaciones',
  entidad:             'vacaciones',
  entidad_id:          id,
  campo_modificado:    'estado',
  valor_anterior:      'pendiente',
  valor_nuevo:         'aprobada',
  usuario_modificador: req.usuario.email,
  rol_modificador:     req.usuario.rol,
  ip_origen:           req.ip,
  user_agent:          req.headers['user-agent']
});

// Al rechazar
historyClient.registrarCambio({
  // ... igual que aprobar pero tipo_accion: 'rechazo_vacaciones', valor_nuevo: 'rechazada'
});
```

---

## 12. Comunicación con otros microservicios

```
vacation-service (3004)
  │
  ├─ → Employee Service (3002)      [opcional]
  │    GET /api/empleados/:id
  │    Verifica que el empleado existe antes de crear la solicitud.
  │    Si el Employee Service no responde, se permite crear igual
  │    (la referencia es lógica, no hay FK real).
  │
  ├─ → History Service (3006)       [fire-and-forget]
  │    POST /api/historial/cambios
  │    En: solicitud_vacaciones, aprobacion_vacaciones, rechazo_vacaciones
  │    No bloquea si falla. Timeout: 3000ms.
  │
  └─ → SMTP (Gmail/SendGrid)        [await]
       Notificaciones a RRHH: solicitud, aprobación, rechazo.
       Sí bloquea — si el correo falla, se registra el error pero
       la operación principal igual retorna 201/200.
```

---

## 13. Casos de Prueba

### Unitarias (`tests/unit/businessRules.test.js`)

```javascript
// tests/unit/businessRules.test.js
const { calcularDiasHabiles, validarAnticipacion,
        validarDiasMinimos, validarDisponibilidad } = require('../../src/services/businessRules.service');

// Mock de festivos 2025 (solo los necesarios para los tests)
const festivos2025 = [
  { fecha: new Date('2025-07-20') }, // Grito de Independencia
  { fecha: new Date('2025-08-07') }, // Batalla de Boyacá
];

describe('TC-VAC-002: Rechaza con menos de 5 días hábiles', () => {
  test('3 días hábiles → lanza error', () => {
    expect(() => validarDiasMinimos(3))
      .toThrow('Las vacaciones deben ser de mínimo 5 días hábiles');
  });

  test('5 días hábiles → no lanza error', () => {
    expect(() => validarDiasMinimos(5)).not.toThrow();
  });
});

describe('TC-VAC-003: Rechaza sin anticipación de 1 mes', () => {
  test('fecha mañana → lanza error', () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    expect(() => validarAnticipacion(manana))
      .toThrow('La solicitud debe realizarse con al menos 1 mes de anticipación');
  });

  test('fecha en 2 meses → no lanza error', () => {
    const dosMeses = new Date();
    dosMeses.setMonth(dosMeses.getMonth() + 2);
    expect(() => validarAnticipacion(dosMeses)).not.toThrow();
  });
});

describe('TC-VAC-004: Rechaza si no hay días disponibles', () => {
  test('solicita 8, tiene 3 → lanza error', () => {
    expect(() => validarDisponibilidad(8, 3))
      .toThrow('El empleado solo tiene 3 días disponibles y solicitó 8');
  });

  test('solicita 5, tiene 15 → no lanza error', () => {
    expect(() => validarDisponibilidad(5, 15)).not.toThrow();
  });
});
```

### Integración — tabla completa

| ID | Caso | Tipo | Resultado Esperado |
|----|------|------|--------------------|
| TC-VAC-001 | Solicitar 5 días hábiles con 1 mes de anticipación | Positivo | 201 · `dias_pendientes` += 5 |
| TC-VAC-002 | Solicitar con menos de 5 días hábiles | Negativo | 400 |
| TC-VAC-003 | Solicitar sin 1 mes de anticipación | Negativo | 400 |
| TC-VAC-004 | Solicitar más días de los disponibles | Negativo | 400 |
| TC-VAC-005 | `fecha_inicio` en festivo colombiano | Negativo | 400 |
| TC-VAC-006 | Solicitud se solapa con otra pendiente | Negativo | 400 |
| TC-VAC-007 | Aprobar solicitud → actualiza `dias_usados` | Positivo | `dias_usados` += días · `dias_pendientes` -= días |
| TC-VAC-008 | Rechazar solicitud → libera `dias_pendientes` | Positivo | `dias_pendientes` -= días |
| TC-VAC-009 | Consultar días disponibles retorna cálculo correcto | Positivo | `dias_disponibles` = totales - usados - pendientes |
| TC-VAC-010 | Rechazar sin `motivo_rechazo` en body | Negativo | 400 |
| TC-VAC-011 | Aprobar solicitud ya aprobada | Negativo | 400 |
| TC-VAC-012 | Solicitud sin token retorna 401 | Negativo | 401 |
| TC-VAC-013 | Solicitud con rol `consulta` retorna 403 | Negativo | 403 |
| TC-VAC-014 | Correo enviado a RRHH al crear solicitud | Positivo | `notificado = true` en BD |
| TC-VAC-015 | `GET /festivos/2025` retorna los 18 festivos | Positivo | Array con 18 elementos |
| TC-VAC-016 | `POST /festivos` con rol `admin` agrega festivo | Positivo | 201 · festivo en BD |
| TC-VAC-017 | `POST /festivos` con rol `rrhh` retorna 403 | Negativo | 403 |

---

## 14. Prueba de Estrés con k6

```javascript
// tests/performance/stress/vacations-stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20  }, // nivel normal
    { duration: '5m', target: 50  }, // carga alta
    { duration: '2m', target: 100 }, // estrés — punto de quiebre
    { duration: '5m', target: 100 }, // mantener estrés
    { duration: '2m', target: 0   }, // recuperación
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // el 95% de requests debe responder en < 2s bajo estrés
    http_req_failed:   ['rate<0.05'],   // máximo 5% de errores permitido bajo estrés extremo
  },
};

export function setup() {
  const res = http.post(
    `${__ENV.AUTH_URL}/api/auth/login`,
    JSON.stringify({ email: 'admin@empresa.com', password: 'Admin1234!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: res.json('access_token') };
}

export default function (data) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Escenario 1: consultar disponibilidad (lectura frecuente)
  const disponibles = http.get(
    `${__ENV.BASE_URL}/api/vacaciones/empleado/1/disponibles`,
    { headers }
  );
  check(disponibles, {
    'status 200':              (r) => r.status === 200,
    'latencia < 2000ms':       (r) => r.timings.duration < 2000,
    'sin error 500':           (r) => r.status !== 500,
    'tiene dias_disponibles':  (r) => r.json('dias_disponibles') !== undefined,
  });
  sleep(0.5);

  // Escenario 2: consultar festivos (muy cacheable)
  const festivos = http.get(
    `${__ENV.BASE_URL}/api/vacaciones/festivos/2025`,
    { headers }
  );
  check(festivos, {
    'festivos status 200':  (r) => r.status === 200,
    'festivos es array':    (r) => Array.isArray(r.json()),
  });
  sleep(0.5);
}
```

### Comandos de ejecución

```bash
# Instalar k6
brew install k6          # macOS
sudo apt install k6      # Ubuntu/Debian

# Prueba de estrés
k6 run \
  --env BASE_URL=http://localhost:3004 \
  --env AUTH_URL=http://localhost:3001 \
  tests/performance/stress/vacations-stress.js

# Con reporte JSON para evidencia
k6 run \
  --env BASE_URL=http://localhost:3004 \
  --env AUTH_URL=http://localhost:3001 \
  --out json=tests/performance/results/vacations-stress-result.json \
  tests/performance/stress/vacations-stress.js
```

### Umbrales esperados

| Métrica | Umbral | Significado |
|---------|--------|-------------|
| `p(95) < 2000ms` | ✅ ok | Bajo estrés extremo, el 95% responde en menos de 2s |
| `http_req_failed < 5%` | ✅ ok | El servicio aguanta sin caerse |
| `checks = 100%` | ✅ ok | La lógica es correcta bajo concurrencia |

---

## 15. Docker y ejecución local

### `Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3004

CMD ["npm", "start"]
```

### `package.json` — scripts relevantes

```json
{
  "scripts": {
    "migrate":      "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "start":        "npm run migrate && node src/index.js",
    "dev":          "npm run migrate && nodemon src/index.js",
    "test":         "jest --runInBand",
    "test:coverage": "jest --coverage --runInBand"
  }
}
```

> `--runInBand` es necesario en Jest para tests de integración que usan la misma BD. Sin él, los tests corren en paralelo y se pisan entre sí.

### Bloque en `docker-compose.yml`

```yaml
vacation-service:
  build: ./vacation-service
  ports:
    - "3004:3004"
  env_file: ./vacation-service/.env
  depends_on:
    postgres-vacation:
      condition: service_healthy
  restart: on-failure

postgres-vacation:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB:       vacation_db
    POSTGRES_USER:     postgres
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  volumes:
    - postgres_vacation_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d vacation_db"]
    interval: 5s
    timeout: 5s
    retries: 10
```

### Levantar solo este servicio para desarrollo

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con valores reales

# 2. Levantar solo vacation-service y su BD
docker-compose up vacation-service postgres-vacation

# 3. Verificar que las migraciones corrieron
docker-compose logs vacation-service | grep -i "migrat\|seed"

# 4. Ejecutar tests unitarios
npm test

# 5. Ejecutar con cobertura
npm run test:coverage
```

---

## 16. Seguridad

- Todos los endpoints requieren `Authorization: Bearer <JWT>`. Solo el middleware `verifyToken.js` valida el token localmente (sin llamar al Auth Service en cada request).
- El JWT_SECRET debe ser idéntico en todos los microservicios del sistema.
- El rol mínimo para crear/aprobar/rechazar solicitudes es `rrhh`. El rol `consulta` solo puede leer.
- Las contraseñas SMTP van en `.env`, nunca en el código.
- El correo SMTP usa autenticación con App Password (Gmail) o API Key (SendGrid).
- La columna `dias_disponibles` es `GENERATED ALWAYS AS` en PostgreSQL — no se puede escribir directamente, lo que evita manipulaciones directas en BD.
- El `empleado_id` en `vacaciones` no tiene FK real (la referencia es lógica via REST), lo que permite que el servicio funcione de forma independiente incluso si el Employee Service está temporalmente caído.

---

*vacation-service · Microservicio 4 del sistema HR · Versión 2.0*
*3 tablas · Node.js + Express + PostgreSQL · Nodemailer · JWT · k6*