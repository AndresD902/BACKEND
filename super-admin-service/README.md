# Super Admin Service

> Microservicio 7 de 7 · Puerto **3007** · Base de datos: `superadmin_db`

Panel de control global del sistema HR. Gestiona super administradores, empresas, administradores de empresa, flujo de demos, suscripciones y auditoría global. Es el único servicio con visibilidad sobre todas las empresas registradas en la plataforma.

---

## Tabla de Contenido

1. [Responsabilidades](#1-responsabilidades)
2. [Tech Stack](#2-tech-stack)
3. [Estructura de Carpetas](#3-estructura-de-carpetas)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Migraciones](#5-migraciones)
6. [API Endpoints](#6-api-endpoints)
7. [Flujos de Negocio](#7-flujos-de-negocio)
8. [Variables de Entorno](#8-variables-de-entorno)
9. [Seguridad y Autenticación](#9-seguridad-y-autenticación)
10. [Conexiones con otros Microservicios](#10-conexiones-con-otros-microservicios)
11. [Arquitectura en Capas](#11-arquitectura-en-capas)
12. [Cómo Ejecutar](#12-cómo-ejecutar)
13. [Pruebas](#13-pruebas)

---

## 1. Responsabilidades

| Dominio | Descripción |
|---------|-------------|
| Super admins | Registro (bootstrap), login, refresh token con rotación, recuperación de contraseña |
| Límite global | Solo pueden existir **2 super admins** — el link de registro se desactiva al alcanzar el límite |
| Empresas | CRUD completo, cambio de plan y estado (activa / inactiva / suspendida) |
| Admins de empresa | Alta de admins (máx. 2 por empresa) con credenciales enviadas por correo |
| Flujo demo | Gestión de solicitudes de demo: aprobación, credenciales temporales (2 días, 1 dispositivo, máx. 2 activaciones) |
| Flujo suscripción | Recepción de formularios de plan, activación de empresa con contrato PDF generado automáticamente |
| Vista de empleados | Consulta de empleados de una empresa con `detalle_estado` legible |
| Auditoría global | Consulta de acciones y cambios desde el History Service |

**Lo que NO hace este servicio:**
- No gestiona empleados directamente (eso es employee-service :3002)
- No emite tokens para admins de empresa (eso es auth-service :3001)
- No guarda contratos ni vacaciones
- No tiene tabla de auditoría propia — delega en history-service :3006

---

## 2. Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18 + TypeScript 5 |
| Framework | Express.js v5 |
| Base de datos | PostgreSQL 14+ con `pg` (sin ORM) |
| Migraciones | node-pg-migrate (TypeScript) |
| Auth | JWT (`jsonwebtoken`) + bcrypt (12 rounds) |
| Validación | Zod |
| HTTP saliente | axios |
| Email | nodemailer + Gmail SMTP |
| Seguridad HTTP | helmet, cors |
| Logging | morgan |
| Pruebas | Vitest + `@vitest/coverage-v8` |
| Contenedor | Docker |

---

## 3. Estructura de Carpetas

```
super-admin-service/
├── migrations/
│   ├── 001_create_super_admins.ts
│   ├── 002_create_empresas.ts
│   ├── 003_create_admins_empresa.ts
│   └── 004_create_refresh_tokens_superadmin.ts
├── src/
│   ├── config/
│   │   ├── database.ts              # Pool pg, connect/disconnect, healthcheck
│   │   └── env.ts                   # Variables validadas al arranque
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   ├── conflict.error.ts       # 409
│   │   │   ├── not-found.error.ts      # 404
│   │   │   └── unauthorized.error.ts   # 401
│   │   └── enums/
│   │       ├── plan.enum.ts            # basico | profesional | enterprise
│   │       └── estado-empresa.enum.ts  # activa | inactiva | suspendida
│   ├── entities/
│   │   ├── super-admin.entity.ts
│   │   ├── empresa.entity.ts
│   │   └── admin-empresa.entity.ts
│   ├── dtos/
│   │   ├── register-super-admin.dto.ts
│   │   ├── login.dto.ts
│   │   ├── create-empresa.dto.ts
│   │   ├── update-empresa.dto.ts       # + updateEstadoSchema
│   │   └── create-admin.dto.ts
│   ├── utils/
│   │   ├── jwt.util.ts                 # signJwt / verifyJwt
│   │   ├── crypto.util.ts              # randomToken, sha256, randomTempPassword
│   │   └── async-handler.util.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts          # verifySuperAdminToken, verifyRegisterSecret
│   │   ├── error-handler.middleware.ts # Manejo centralizado de errores HTTP
│   │   └── validation.middleware.ts    # validateBody(zodSchema) — valida req.body con Zod
│   ├── clients/
│   │   ├── authClient.ts              # POST /auth/register en Auth Service
│   │   ├── employeeClient.ts          # GET /empleados en Employee Service
│   │   └── historyClient.ts           # registrarAccion, obtenerAcciones, obtenerCambios
│   ├── repositories/
│   │   ├── superAdmin.repository.ts
│   │   ├── empresa.repository.ts
│   │   ├── adminEmpresa.repository.ts
│   │   └── refreshToken.repository.ts
│   ├── services/
│   │   ├── auth.service.ts            # login, refresh, logout, recover/reset password
│   │   ├── empresa.service.ts         # CRUD empresas, admins, demos, empleados
│   │   ├── email.service.ts           # nodemailer con transporter inyectable
│   │   └── auditoria.service.ts       # delega en historyClient
│   ├── controller/
│   │   ├── auth.controller.ts
│   │   ├── empresa.controller.ts
│   │   └── auditoria.controller.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── empresa.routes.ts
│   │   ├── auditoria.routes.ts
│   │   └── health.routes.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── setup.ts
│   └── unit/
│       ├── services/
│       │   ├── auth.service.test.ts
│       │   └── empresa.service.test.ts
│       ├── controllers/
│       │   ├── auth.controller.test.ts
│       │   └── empresa.controller.test.ts
│       ├── middlewares/
│       │   ├── auth.middleware.test.ts
│       │   ├── error-handler.middleware.test.ts
│       │   └── validation.middleware.test.ts
│       ├── utils/
│       │   ├── jwt.util.test.ts
│       │   ├── crypto.util.test.ts
│       │   └── async-handler.util.test.ts
│       ├── clients/
│       │   └── historyClient.test.ts
│       └── shared/errors/
│           └── app-error.test.ts
├── vitest.config.ts
├── .env.example
├── Dockerfile
├── tsconfig.json
└── tsconfig.build.json
```

---

## 4. Modelo de Datos

```sql
-- Enums
CREATE TYPE plan_enum           AS ENUM ('basico', 'profesional', 'enterprise');
CREATE TYPE estado_empresa_enum AS ENUM ('activa', 'inactiva', 'suspendida');

-- Tabla 1: Super administradores (máx. 2 globalmente)
CREATE TABLE super_admins (
  id                  BIGSERIAL PRIMARY KEY,
  nombre              VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login        TIMESTAMP,
  reset_token         VARCHAR(255),         -- SHA-256 del token de recuperación
  reset_token_expires TIMESTAMP,            -- TTL: RESET_TOKEN_EXPIRES_MINUTES
  created_at          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Empresas registradas en la plataforma
CREATE TABLE empresas (
  id         BIGSERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  nit        VARCHAR(20) NOT NULL UNIQUE,
  correo     VARCHAR(150) NOT NULL,
  telefono   VARCHAR(20),
  plan       plan_enum NOT NULL DEFAULT 'basico',
  estado     estado_empresa_enum NOT NULL DEFAULT 'activa',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: Administradores por empresa (máx. 2 activos por empresa)
CREATE TABLE admins_empresa (
  id         BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  email      VARCHAR(150) NOT NULL,
  nombre     VARCHAR(100),
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (empresa_id, email)
);

-- Tabla 4: Refresh tokens del super admin
CREATE TABLE refresh_tokens_superadmin (
  id             BIGSERIAL PRIMARY KEY,
  super_admin_id BIGINT NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  token_hash     VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 del token
  expires_at     TIMESTAMP NOT NULL,
  revocado       BOOLEAN NOT NULL DEFAULT FALSE,
  ip_origen      VARCHAR(50),
  user_agent     TEXT,
  created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_empresa_id        ON admins_empresa(empresa_id);
CREATE INDEX idx_refresh_tokens_sa_hash   ON refresh_tokens_superadmin(token_hash);
CREATE INDEX idx_refresh_tokens_sa_sa_id  ON refresh_tokens_superadmin(super_admin_id);
```

---

## 5. Migraciones

```bash
npm run migrate        # Aplica migraciones pendientes
npm run migrate:down   # Revierte la última migración
```

Orden de ejecución:

```
001_create_super_admins.ts                → tabla super_admins + enums
002_create_empresas.ts                    → tabla empresas
003_create_admins_empresa.ts              → tabla admins_empresa (máx. 2 por empresa)
004_create_refresh_tokens_superadmin.ts   → tabla refresh_tokens_superadmin
```

---

## 6. API Endpoints

Base path: `/api/super-admin`

### Autenticación del super admin

| Método | Endpoint | Auth requerida | Descripción |
|--------|----------|---------------|-------------|
| POST | `/register` | `X-Register-Secret` header | Bootstrap — crea el primer super admin |
| POST | `/login` | ❌ | Login → access_token + refresh_token |
| POST | `/refresh` | ❌ (body: refresh_token) | Renueva tokens (rotación) |
| POST | `/logout` | ✅ JWT super admin | Revoca el refresh_token actual |
| POST | `/recover-password` | ❌ | Envía email con token de recuperación |
| POST | `/reset-password` | ❌ (body: token) | Restablece contraseña con token |

### Empresas

Todos requieren JWT de super admin.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/empresas` | Listar empresas paginadas (query: `page`, `limit`) |
| POST | `/empresas` | Crear empresa + 2 admins automáticos + enviar credenciales |
| GET | `/empresas/:id` | Detalle de empresa con sus admins |
| PATCH | `/empresas/:id` | Actualizar nombre, correo, teléfono o plan |
| PATCH | `/empresas/:id/estado` | Cambiar estado (activa / inactiva / suspendida) |
| POST | `/empresas/:id/admins` | Agregar admin manual (máx. 2 activos) |
| GET | `/empresas/:id/empleados` | Empleados de la empresa con `detalle_estado` |

### Auditoría

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/auditoria/acciones` | Acciones globales del History Service (query: `empresa`, `accion`, `desde`, `hasta`, `email`, `page`, `limit`) |
| GET | `/auditoria/cambios` | Cambios de entidades globales (query: `empresa`, `tipo`, `desde`, `hasta`, `email`, `page`, `limit`) |

### Salud

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Estado del servicio y BD |

---

### Parámetros de Query

#### `GET /api/super-admin/empresas` — Listar empresas

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | 1 | Número de página |
| `limit` | number | 20 | Registros por página |

#### `GET /api/super-admin/auditoria/acciones` — Acciones globales

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `empresa` | string | Filtrar por nombre/NIT de empresa |
| `accion` | string | Filtrar por tipo de acción (login, registro, etc.) |
| `desde` | `YYYY-MM-DD` | Fecha inicial (inclusive) |
| `hasta` | `YYYY-MM-DD` | Fecha final (inclusive) |
| `email` | string | Filtrar por email del usuario |
| `page` | number | Número de página (default: 1) |
| `limit` | number | Registros por página (default: 50) |

#### `GET /api/super-admin/auditoria/cambios` — Cambios de entidades

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `empresa` | string | Filtrar por nombre/NIT de empresa |
| `tipo` | string | Filtrar por tipo de entidad (empresa, admin, etc.) |
| `desde` | `YYYY-MM-DD` | Fecha inicial (inclusive) |
| `hasta` | `YYYY-MM-DD` | Fecha final (inclusive) |
| `email` | string | Filtrar por email del usuario que hizo el cambio |
| `page` | number | Número de página (default: 1) |
| `limit` | number | Registros por página (default: 50) |

---

### Ejemplos de request / response

**POST `/api/super-admin/register`** (bootstrap)
```bash
curl -X POST http://localhost:3007/api/super-admin/register \
  -H "Content-Type: application/json" \
  -H "X-Register-Secret: <valor de REGISTER_SECRET>" \
  -d '{"nombre":"Duber Zapata","email":"superadmin@empresa.com","password":"Segura#1234"}'
```
```json
// Response 201
{
  "success": true,
  "data": { "id": 1, "nombre": "Duber Zapata", "email": "superadmin@empresa.com" }
}

// Response 409 — ya existen 2 super admins
{
  "success": false,
  "error": { "code": "CONFLICT", "message": "Ya existen 2 super administradores registrados. No se pueden crear más." }
}
```

**POST `/api/super-admin/login`**
```json
// Request
{ "email": "superadmin@empresa.com", "password": "Segura#1234" }

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "a3f9d2...",
    "expiresIn": 3600
  }
}
```

**POST `/api/super-admin/empresas`**
```json
// Request
{
  "nombre": "Tech Corp S.A.S",
  "nit": "900123456-7",
  "correo": "contacto@techcorp.com",
  "telefono": "6012345678",
  "plan": "profesional"
}

// Response 201
{
  "success": true,
  "data": {
    "empresa": { "id": 1, "nombre": "Tech Corp S.A.S", "plan": "profesional", "estado": "activa" },
    "admins": [
      { "email": "admin1.9001234567@techcorp.com", "nombre": "Administrador 1 — Tech Corp S.A.S" },
      { "email": "admin2.9001234567@techcorp.com", "nombre": "Administrador 2 — Tech Corp S.A.S" }
    ]
  }
}
```

**PATCH `/api/super-admin/empresas/:id/estado`**
```json
// Request
{ "estado": "suspendida" }

// Response 200
{
  "success": true,
  "data": { "id": 1, "estado": "suspendida", "updated_at": "2026-05-07T15:30:00.000Z" }
}
```

**POST `/api/super-admin/empresas/:id/admins`**
```json
// Request
{ "nombre": "María López", "email": "maria.lopez@techcorp.com" }

// Response 201 — admin creado en Auth Service y credenciales enviadas por email
{
  "success": true,
  "data": { "id": 123, "email": "maria.lopez@techcorp.com", "nombre": "María López", "activo": true }
}

// Response 409 — empresa ya tiene 2 admins activos
{
  "success": false,
  "error": { "code": "MAX_ADMINS_REACHED", "message": "La empresa ya tiene el máximo de 2 administradores activos." }
}
```

**GET `/api/super-admin/empresas/:id/empleados`**
```json
// Response 200
{
  "success": true,
  "data": [
    { "id": 1, "nombre": "Ana", "apellido": "García", "estado": "activo",
      "detalle_estado": "Trabajando actualmente" },
    { "id": 2, "nombre": "Carlos", "apellido": "Ruiz", "estado": "retirado",
      "detalle_estado": "Ya no forma parte de la empresa" },
    { "id": 3, "nombre": "Laura", "apellido": "Pérez", "estado": "inactivo",
      "detalle_estado": "Ausentismo temporal: Incapacidad médica" }
  ]
}
```

---

## 6B. Funcionalidades Implementadas (No documentadas en secciones previas)

### Response wrapper estándar

Todos los endpoints retornan un wrapper consistente:
```json
{
  "success": true | false,
  "data": {...},         // En caso de éxito
  "error": {...}         // En caso de error
}
```

**Propósito:** Estandarizar todas las respuestas para facilitar el manejo en cliente.

### Parámetros query en auditoría con múltiples filtros

Los endpoints de auditoría (`/auditoria/acciones` y `/auditoria/cambios`) soportan filtrado combinado:
- **Filtrado por empresa:** parámetro `empresa` busca en nombre o NIT
- **Filtrado por tipo:** `accion` para acciones, `tipo` para cambios
- **Rango de fechas:** `desde` y `hasta` (YYYY-MM-DD, inclusive)
- **Por usuario:** parámetro `email` filtra por actor
- **Paginación:** `page` (default 1) y `limit` (default 50)

**Razón:** Permite auditoría granular de eventos globales del sistema.

### Paginación en listar empresas

`GET /empresas` soporta:
- `page` (default: 1)
- `limit` (default: 20)

**Nota:** No documentado explícitamente pero implementado en controller.

### Enriquecimiento de `detalle_estado` en empleados

`GET /empresas/:id/empleados` enriquece cada empleado con un campo legible:
- `activo` → "Trabajando actualmente"
- `inactivo` → "Ausentismo temporal: [justificación]"
- `transicion` → "Contrato próximo a vencer, en proceso de renovación"
- `retirado` → "Ya no forma parte de la empresa"

**Propósito:** Mostrar estado legible sin exponer campos técnicos a usuarios finales.

### Creación automática de 2 admins por empresa

Cuando se crea una empresa (`POST /empresas`):
1. Se crean automáticamente 2 admins (admin1 y admin2)
2. Se registran en Auth Service
3. Se envían credenciales temporales por correo
4. Se genera un PDF de contrato y se envía también

**Razón:** Automatiza el flujo de onboarding; una empresa nueva tiene inmediatamente acceso.

### Anti-enumeración en recover password

`POST /recover-password` siempre retorna:
```json
{ "success": true, "message": "Si el correo existe, recibirás un enlace..." }
```

Incluso si el email no existe en BD.

**Propósito:** Prevenir ataques que enumeren usuarios válidos.

### Rotación de refresh tokens

`POST /refresh` implementa rotación obligatoria:
1. El token anterior se marca como revocado
2. Se genera un nuevo refresh_token
3. El cliente DEBE usar el nuevo token en la próxima renovación

**Propósito:** Reduce el impacto de tokens comprometidos.

### Reset password revoca todos los tokens

`POST /reset-password` revoca **todos** los refresh_tokens del super admin, no solo el actual.

**Propósito:** Fuerza cierre de todas las sesiones activas en otros dispositivos.

---

## 7. Flujos de Negocio

### Bootstrap — crear primer super admin

```
POST /api/super-admin/register
  Header: X-Register-Secret: <REGISTER_SECRET>
  1. Middleware verifyRegisterSecret valida el header
  2. Verificar que el total de super admins en BD < 2
     → Si ya hay 2 → 409 "Ya existen 2 super administradores registrados"
  3. bcrypt.hash(password, 12 rounds)
  4. INSERT en super_admins
  5. Retornar 201
```

### Login y refresh token

```
POST /api/super-admin/login
  1. Buscar super admin por email
  2. bcrypt.compare(password, password_hash)
  3. Si falla → registrar intento fallido en History (fire-and-forget) → 401
  4. Generar access_token (JWT, exp: JWT_EXPIRES_IN)
     Payload: { id, email, rol: 'super_admin' }
  5. Generar refresh_token (crypto.randomBytes → SHA-256 almacenado)
  6. INSERT en refresh_tokens_superadmin
  7. Registrar 'login' exitoso en History (fire-and-forget)
  8. Retornar { accessToken, refreshToken, expiresIn }

POST /api/super-admin/refresh
  1. SHA-256(refresh_token del body) → buscar en BD
  2. Verificar: no revocado, no expirado
  3. Revocar token actual → generar nuevo access_token y nuevo refresh_token (rotación)
  4. Retornar nuevos tokens
```

### Recuperación de contraseña

```
POST /api/super-admin/recover-password
  1. Buscar super admin por email
  2. Si no existe → 200 con mensaje genérico (anti-enumeración)
  3. Generar token → SHA-256 guardado en super_admins.reset_token con TTL
  4. Enviar email: {FRONTEND_URL}/reset-password?token=<token_en_claro>

POST /api/super-admin/reset-password
  1. SHA-256(token) → buscar en super_admins
  2. Verificar que no haya expirado
  3. bcrypt.hash(nueva contraseña)
  4. UPDATE super_admins: password_hash, reset_token=NULL, reset_token_expires=NULL
  5. Revocar TODOS los refresh tokens del super admin
  6. Retornar 200
```

### Crear empresa con admins automáticos

```
POST /api/super-admin/empresas
  1. Verificar JWT con rol 'super_admin'
  2. Validar NIT único en BD
  3. INSERT en empresas
  4. Para i = 1..2:
     a. Generar contraseña temporal (crypto.randomBytes(8).toString('hex'))
     b. Construir email: admin{i}.{nit_limpio}@{dominio_empresa}
     c. POST a Auth Service /api/v1/auth/register { email, password, role: 'ADMIN' }
     d. INSERT en admins_empresa
     e. Enviar email al correo de la empresa con usuario y contraseña por defecto
  5. Generar PDF de contrato de servicio (nombre empresa, plan, 2 usuarios admin)
  6. Enviar PDF por correo a la empresa
  7. Retornar 201 con { empresa, admins }
  ⚠ Si falla la creación de un admin: se loguea el error y continúa con el siguiente
```

### Vista de empleados con detalle_estado

```
GET /api/super-admin/empresas/:id/empleados
  1. Verificar JWT super admin
  2. GET http://employee-service:3002/api/empleados (con token de super admin)
  3. Enriquecer cada empleado con detalle_estado legible:
     activo     → "Trabajando actualmente"
     inactivo   → "Ausentismo temporal" + justificación si existe
     transicion → "Contrato próximo a vencer, en proceso de renovación"
     retirado   → "Ya no forma parte de la empresa"
  4. Retornar lista enriquecida
```

---

## 8. Variables de Entorno

```env
# Aplicación
NODE_ENV=development
PORT=3007
SERVICE_NAME=super-admin-service

# Base de datos propia
DATABASE_URL=postgres://postgres:password@localhost:5432/superadmin_db

# JWT del super admin (puede ser distinto al JWT_SECRET de los demás servicios)
JWT_SECRET=minimo_32_caracteres_superadmin_muy_seguro_aqui
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7

# Bootstrap — protección del endpoint de registro
# Header requerido: X-Register-Secret: <valor>
REGISTER_SECRET=clave_secreta_para_crear_primer_superadmin

# Recuperación de contraseña
RESET_TOKEN_EXPIRES_MINUTES=15
FRONTEND_URL=http://localhost:5173

# Comunicación entre servicios
AUTH_SERVICE_URL=http://localhost:3001/api/v1
EMPLOYEE_SERVICE_URL=http://localhost:3002/api
HISTORY_SERVICE_URL=http://localhost:3006
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion
REQUEST_TIMEOUT_MS=8000
CORS_ORIGINS=http://localhost:5173

# SMTP para correos (credenciales, contratos PDF, demos)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tucorreo@gmail.com
SMTP_PASS=app_password_16_chars   # App Password de Gmail
```

### Notas importantes

- `JWT_SECRET` puede ser distinto al de los demás servicios — los tokens de super admin solo son válidos aquí.
- `REGISTER_SECRET` se usa **únicamente** para el bootstrap. Mantenlo fuera del control de versiones.
- `INTERNAL_API_KEY` protege la escritura de auditoría hacia History Service.
- Para Gmail, `SMTP_PASS` debe ser una **App Password** (no la contraseña de la cuenta de Google).

---

## 9. Seguridad y Autenticación

### Tokens JWT del super admin

- Payload: `{ id, email, rol: 'super_admin' }`
- `verifySuperAdminToken` verifica la firma y que `rol === 'super_admin'`
- Los tokens son stateless y expiran en `JWT_EXPIRES_IN` (default 1h)

### Refresh tokens

- Almacenados como **SHA-256** del token en claro — nunca el token en texto plano
- Cada renovación **rota** el refresh token (el anterior se revoca)
- Al resetear contraseña se revocan **todos** los refresh tokens del usuario

### Bootstrap register

- `POST /api/super-admin/register` requiere `X-Register-Secret: <REGISTER_SECRET>`
- Sin el header devuelve `401`
- Se desactiva automáticamente cuando ya existen 2 super admins en BD

### Contraseñas

- Bcrypt con **12 rounds** para passwords de super admins
- Contraseñas temporales de admins de empresa generadas con `crypto.randomBytes`
- Contraseñas temporales enviadas por correo — deben cambiarse en el primer login

### Correos HTML

- Todos los valores de usuario se pasan por `escapeHtml()` antes de insertarlos en plantillas HTML (previene XSS en el body del correo)

---

## 10. Conexiones con otros Microservicios

```
┌────────────────────────────────────────────────────────────────┐
│                 super-admin-service :3007                      │
│                                                                │
│  authClient ──────────────────────────► auth-service :3001    │
│  (POST /auth/register al crear empresa)                        │
│                                                                │
│  employeeClient ───────────────────────► employee-svc :3002   │
│  (GET /empleados al listar empleados)                          │
│                                                                │
│  historyClient ────────────────────────► history-svc :3006    │
│  (fire-and-forget: logins, acciones del super admin)           │
│  (GET: consulta de auditoría global)                           │
└────────────────────────────────────────────────────────────────┘
```

| Cliente | Servicio destino | Operaciones |
|---------|-----------------|-------------|
| `authClient` | Auth Service :3001 | `registrarUsuario` — crea admins de empresa |
| `employeeClient` | Employee Service :3002 | `getEmpleados` — lista empleados de una empresa |
| `historyClient` | History Service :3006 | `registrarAccion` (fire-and-forget), `obtenerAcciones`, `obtenerCambios` |

### Fire-and-forget

```typescript
// historyClient.ts — nunca bloquea ni lanza
export const registrarAccion = async (datos: RegistrarAccionDto): Promise<void> => {
  axios.post(`${env.historyServiceUrl}/api/historial/acciones`, datos)
    .catch((err) => console.warn('[HistoryClient] No se pudo registrar acción:', err.message));
};
```

---

## 11. Arquitectura en Capas

```
Request HTTP
    │
    ▼
routes/          ← define método + path + middlewares + validación Zod
    │
    ▼
middlewares/     ← verifySuperAdminToken, verifyRegisterSecret, validateBody, errorHandler
    │
    ▼
controller/      ← extrae req.body / req.params, llama al service, devuelve res.json()
    │
    ▼
services/        ← lógica de negocio, orquesta repositorios y clientes
    │
    ▼
repositories/    ← queries SQL puras con pg Pool (sin lógica de negocio)
    │
    ▼
PostgreSQL (superadmin_db)

services/ también llama a → clients/ → otros microservicios
```

**Regla:** ninguna capa salta a otra no adyacente. El controller no toca la BD. El repository no tiene lógica de negocio.

---

## 12. Cómo Ejecutar

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ con base de datos `superadmin_db` creada

```bash
psql -U postgres -c "CREATE DATABASE superadmin_db;"
```

### Desarrollo local

```bash
npm install
cp .env.example .env
# Editar .env con valores reales

npm run migrate
npm run dev
# → http://localhost:3007
```

### Crear el primer super admin (solo una vez)

```bash
curl -X POST http://localhost:3007/api/super-admin/register \
  -H "Content-Type: application/json" \
  -H "X-Register-Secret: <valor de REGISTER_SECRET en .env>" \
  -d '{
    "nombre": "Duber Zapata",
    "email": "superadmin@empresa.com",
    "password": "Segura#1234"
  }'
```

### Producción

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t super-admin-service .
docker run -p 3007:3007 --env-file .env super-admin-service
```

---

## 13. Pruebas

```bash
npm test                    # Ejecutar todas las pruebas
npm run test:watch          # Modo watch
npm run test:coverage       # Con reporte de cobertura
```

### Umbrales de cobertura configurados

| Métrica | Umbral |
|---------|--------|
| Lines | 80% |
| Functions | 80% |
| Branches | 70% |
| Statements | 80% |

### Patrones de testing usados

- `vi.mock()` para aislar dependencias externas (pg Pool, axios, nodemailer, jsonwebtoken)
- `EmailService` acepta un `Transporter` inyectado en el constructor (testeable sin SMTP real)
- `historyClient` se testea verificando que nunca lanza aunque axios rechace
- Tests de middlewares con objetos `req/res/next` simulados manualmente

### Casos cubiertos

| ID | Caso | Tipo |
|----|------|------|
| TC-SA-001 | Bootstrap cuando hay 0 super admins → 201 | Positivo |
| TC-SA-002 | Bootstrap cuando ya hay 2 super admins → 409 | Negativo |
| TC-SA-003 | Bootstrap sin X-Register-Secret → 401 | Negativo |
| TC-SA-004 | Login exitoso → tokens + registra en History | Positivo |
| TC-SA-005 | Login con contraseña incorrecta → 401 | Negativo |
| TC-SA-006 | Refresh con rotación → nuevos tokens | Positivo |
| TC-SA-007 | Refresh revocado → 401 | Negativo |
| TC-SA-008 | Crear empresa → 2 admins automáticos + correo | Positivo |
| TC-SA-009 | Crear empresa con NIT duplicado → 409 | Negativo |
| TC-SA-010 | Agregar 3er admin → 409 (máx. 2) | Negativo |
| TC-SA-011 | Cambiar estado empresa → activa/inactiva/suspendida | Positivo |
| TC-SA-012 | Recover password → respuesta genérica (anti-enumeración) | Positivo |
| TC-SA-013 | Reset password con token expirado → 401 | Negativo |
| TC-SA-014 | historyClient no lanza aunque axios falle | Positivo |
| TC-SA-015 | Vista empleados con detalle_estado enriquecido | Positivo |