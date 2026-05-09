# super-admin-service

Microservicio de administración global del sistema de RR. HH. Gestiona super administradores, empresas y sus admins desde un panel centralizado. Puerto **3007**, base de datos **superadmin_db**.

---

## Tabla de contenidos

1. [Inicio rápido](#1-inicio-rápido)
2. [Descripción del servicio](#2-descripción-del-servicio)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Base de datos y migraciones](#6-base-de-datos-y-migraciones)
7. [Endpoints](#7-endpoints)
8. [Flujos de negocio](#8-flujos-de-negocio)
9. [Seguridad y autenticación](#9-seguridad-y-autenticación)
10. [Conexiones con otros microservicios](#10-conexiones-con-otros-microservicios)
11. [Arquitectura en capas](#11-arquitectura-en-capas)
12. [Manejo de errores](#12-manejo-de-errores)
13. [Ejecución con Docker](#13-ejecución-con-docker)
14. [Testing](#14-testing)

---

## 1. Inicio rápido

Pasos para ejecutar el servicio en local desde cero.

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ corriendo localmente
- Base de datos `superadmin_db` creada

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE superadmin_db;"
```

### Instalación

```bash
# 1. Clonar / ubicarse en la carpeta
cd super-admin-service

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales (ver sección 5)

# 4. Ejecutar migraciones
npm run migrate

# 5. Iniciar en modo desarrollo
npm run dev
```

El servicio queda disponible en `http://localhost:3007`.

### Crear el primer super admin (bootstrap)

El endpoint de registro está protegido por un header secreto para evitar acceso público.
Solo se usa una vez para crear el primer super admin del sistema:

```bash
curl -X POST http://localhost:3007/api/super-admin/register \
  -H "Content-Type: application/json" \
  -H "X-Register-Secret: <valor de REGISTER_SECRET en .env>" \
  -d '{
    "nombre": "Super Admin",
    "email": "superadmin@empresa.com",
    "password": "contraseña_segura"
  }'
```

Después de crear el primer super admin, guarda el header secreto en un lugar seguro.
Los siguientes super admins los puede crear el primero desde el sistema con JWT.

---

## 2. Descripción del servicio

El `super-admin-service` actúa como **panel de control global** del sistema. Es el único servicio con visibilidad sobre todas las empresas registradas y sus administradores.

### Responsabilidades

| Dominio             | Descripción                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| Super admins        | Registro (bootstrap), login, refresh token, recuperación de contraseña      |
| Empresas            | CRUD completo de empresas, cambio de plan y estado                          |
| Admins de empresa   | Alta de admins (máx. 2 por empresa) con credenciales enviadas por correo    |
| Vista de empleados  | Consulta de empleados de una empresa con descripción legible del estado      |
| Auditoría global    | Consulta de acciones y cambios desde el History Service                     |

### Lo que NO hace este servicio

- No gestiona empleados directamente (eso es `employee-service` :3002)
- No emite tokens para admins de empresa (eso es `auth-service` :3001)
- No guarda contratos ni vacaciones (otros microservicios)
- No tiene su propia tabla de auditoría — delega en `history-service` :3006

---

## 3. Stack tecnológico

| Categoría       | Tecnología                              |
|-----------------|-----------------------------------------|
| Runtime         | Node.js 18 + Express 5                  |
| Lenguaje        | TypeScript 5                            |
| Base de datos   | PostgreSQL 14+ con `pg` (sin ORM)       |
| Migraciones     | `node-pg-migrate` (archivos TypeScript) |
| Auth            | JWT (`jsonwebtoken`) + bcrypt           |
| Validación      | Zod                                     |
| HTTP saliente   | axios                                   |
| Correos         | nodemailer                              |
| Seguridad HTTP  | helmet, cors                            |
| Logging HTTP    | morgan                                  |
| Testing         | Vitest + @vitest/coverage-v8            |
| Contenedor      | Docker                                  |

---

## 4. Estructura de carpetas

```
super-admin-service/
├── src/
│   ├── config/
│   │   ├── database.ts          # Pool pg, connect/disconnect, healthcheck
│   │   └── env.ts               # Variables de entorno validadas al arranque
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── app-error.ts     # Clase base AppError(message, statusCode, code)
│   │   │   ├── conflict.error.ts      # 409
│   │   │   ├── not-found.error.ts     # 404
│   │   │   └── unauthorized.error.ts  # 401
│   │   └── enums/
│   │       ├── plan.enum.ts            # basico | profesional | enterprise
│   │       └── estado-empresa.enum.ts  # activa | inactiva | suspendida
│   ├── entities/
│   │   ├── super-admin.entity.ts
│   │   ├── empresa.entity.ts
│   │   └── admin-empresa.entity.ts
│   ├── dtos/
│   │   ├── register-super-admin.dto.ts  # Zod schema para registro
│   │   ├── login.dto.ts
│   │   ├── create-empresa.dto.ts
│   │   ├── update-empresa.dto.ts        # + updateEstadoSchema
│   │   └── create-admin.dto.ts
│   ├── utils/
│   │   ├── jwt.util.ts          # signJwt / verifyJwt
│   │   ├── crypto.util.ts       # randomToken, sha256, randomTempPassword
│   │   └── async-handler.util.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts        # verifySuperAdminToken, verifyRegisterSecret
│   │   ├── error-handler.middleware.ts
│   │   └── validation.middleware.ts  # validateBody(zodSchema)
│   ├── clients/
│   │   ├── authClient.ts        # POST /auth/register en Auth Service
│   │   ├── employeeClient.ts    # GET /empleados en Employee Service
│   │   └── historyClient.ts     # registrarAccion, obtenerAcciones, obtenerCambios
│   ├── repositories/
│   │   ├── superAdmin.repository.ts
│   │   ├── empresa.repository.ts
│   │   ├── adminEmpresa.repository.ts
│   │   └── refreshToken.repository.ts
│   ├── services/
│   │   ├── auth.service.ts      # login, refresh, logout, recover/reset password
│   │   ├── empresa.service.ts   # CRUD empresas, admins, empleados
│   │   ├── email.service.ts     # nodemailer con transporter inyectable
│   │   └── auditoria.service.ts # delega en historyClient
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
│   ├── app.ts                   # Express: helmet, cors, morgan, rutas
│   └── server.ts                # Arranque: DB + listen
├── migrations/
│   ├── 001_create_super_admins.ts
│   ├── 002_create_empresas.ts
│   ├── 003_create_admins_empresa.ts
│   └── 004_create_refresh_tokens_superadmin.ts
├── Dockerfile
├── .env.example
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## 5. Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```env
NODE_ENV=development
PORT=3007
SERVICE_NAME=super-admin-service

# ── Base de datos propia ──────────────────────────────────────────────────────
DATABASE_URL=postgres://postgres:password@localhost:5432/superadmin_db

# ── JWT del super admin ────────────────────────────────────────────────────────
JWT_SECRET=minimo_32_caracteres_superadmin_muy_seguro_aqui
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7
CORS_ORIGINS=http://localhost:5173
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion

# ── Protección del endpoint de registro (bootstrap inicial) ───────────────────
# Header requerido: X-Register-Secret: <valor>
REGISTER_SECRET=clave_secreta_para_crear_primer_superadmin

# ── URLs de microservicios dependientes ───────────────────────────────────────
AUTH_SERVICE_URL=http://localhost:3001/api/v1
EMPLOYEE_SERVICE_URL=http://localhost:3002/api
HISTORY_SERVICE_URL=http://localhost:3006

# ── Timeout HTTP entre servicios ──────────────────────────────────────────────
REQUEST_TIMEOUT_MS=8000

# ── SMTP para correos ─────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tucorreo@gmail.com
SMTP_PASS=tu_app_password_gmail

# ── Frontend (enlace en correos de recuperación) ──────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── Expiración del token de recuperación de contraseña (minutos) ─────────────
RESET_TOKEN_EXPIRES_MINUTES=15
```

### Notas importantes

- `JWT_SECRET` puede ser distinto al `JWT_SECRET` de los otros servicios. Los tokens de super admin solo son válidos aquí.
- `REGISTER_SECRET` se usa **únicamente** para el endpoint de bootstrap. Mantenlo fuera del control de versiones.
- `INTERNAL_API_KEY` protege la escritura de auditoría hacia History Service; en producción debe configurarse explícitamente.
- Para Gmail, `SMTP_PASS` debe ser una **App Password** (no la contraseña de la cuenta).

---

## 6. Base de datos y migraciones

### Tablas

| Tabla                        | Descripción                                              |
|------------------------------|----------------------------------------------------------|
| `super_admins`               | Usuarios super admin con hash bcrypt y tokens de reset   |
| `empresas`                   | Empresas del sistema con plan y estado                   |
| `admins_empresa`             | Admins de empresa registrados por el super admin         |
| `refresh_tokens_superadmin`  | Refresh tokens con hash SHA-256, revocables por registro |

### Schema resumido

```sql
-- Enums
CREATE TYPE plan_enum          AS ENUM ('basico', 'profesional', 'enterprise');
CREATE TYPE estado_empresa_enum AS ENUM ('activa', 'inactiva', 'suspendida');

-- super_admins
CREATE TABLE super_admins (
  id                  BIGSERIAL PRIMARY KEY,
  nombre              VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login        TIMESTAMP,
  reset_token         VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- empresas
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

-- admins_empresa (max 2 por empresa)
CREATE TABLE admins_empresa (
  id         BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  email      VARCHAR(150) NOT NULL,
  nombre     VARCHAR(100),
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- refresh_tokens_superadmin
CREATE TABLE refresh_tokens_superadmin (
  id             BIGSERIAL PRIMARY KEY,
  super_admin_id BIGINT NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  token_hash     VARCHAR(255) NOT NULL UNIQUE,
  expires_at     TIMESTAMP NOT NULL,
  revocado       BOOLEAN NOT NULL DEFAULT FALSE,
  ip_origen      VARCHAR(50),
  user_agent     TEXT,
  created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Ejecutar migraciones

```bash
# Aplicar todas las migraciones pendientes
npm run migrate

# Revertir la última migración
npm run migrate:down
```

Las migraciones se nombran `001_`, `002_` etc. y se ejecutan en orden. En Docker, el contenedor las aplica automáticamente al arrancar.

---

## 7. Endpoints

Base path: `/api`

### Autenticación de super admin

| Método | Endpoint                          | Auth requerida               | Descripción                                |
|--------|-----------------------------------|------------------------------|--------------------------------------------|
| POST   | `/super-admin/register`           | `X-Register-Secret` header   | Crea el primer super admin (bootstrap)     |
| POST   | `/super-admin/login`              | Ninguna                      | Login → devuelve JWT + refresh token       |
| POST   | `/super-admin/refresh`            | Ninguna (body: refresh_token)| Renueva el access token                    |
| POST   | `/super-admin/logout`             | JWT super admin              | Revoca el refresh token                    |
| POST   | `/super-admin/recover-password`   | Ninguna                      | Envía email con token de recuperación      |
| POST   | `/super-admin/reset-password`     | Ninguna (body: token)        | Resetea la contraseña con el token         |

### Empresas

Todos los endpoints de empresas requieren JWT de super admin.

| Método | Endpoint                              | Descripción                                              |
|--------|---------------------------------------|----------------------------------------------------------|
| GET    | `/super-admin/empresas`               | Listar empresas (paginado, incluye admins)               |
| POST   | `/super-admin/empresas`               | Crear empresa + auto-crear 2 admins + enviar credenciales|
| GET    | `/super-admin/empresas/:id`           | Detalle de empresa con sus admins                        |
| PATCH  | `/super-admin/empresas/:id`           | Actualizar nombre, correo, teléfono o plan               |
| PATCH  | `/super-admin/empresas/:id/estado`    | Cambiar estado (activa / inactiva / suspendida)          |
| POST   | `/super-admin/empresas/:id/admins`    | Agregar admin manual (máx. 2 activos por empresa)        |
| GET    | `/super-admin/empresas/:id/empleados` | Listar empleados de la empresa con `detalle_estado`      |

### Auditoría

| Método | Endpoint                              | Auth requerida  | Descripción                        |
|--------|---------------------------------------|-----------------|------------------------------------|
| GET    | `/super-admin/auditoria/acciones`     | JWT super admin | Acciones globales del History Service |
| GET    | `/super-admin/auditoria/cambios`      | JWT super admin | Cambios de entidades globales       |

### Health

| Método | Endpoint   | Auth requerida | Descripción                        |
|--------|------------|----------------|------------------------------------|
| GET    | `/health`  | Ninguna        | Estado del servicio y conexión a BD |

---

### Ejemplos de request / response

**POST `/api/super-admin/login`**
```json
// Request
{ "email": "superadmin@empresa.com", "password": "mi_contraseña" }

// Response 200
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "a3f9d2...",
  "expires_in": 3600
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
  "empresa": {
    "id": 1,
    "nombre": "Tech Corp S.A.S",
    "nit": "900123456-7",
    "plan": "profesional",
    "estado": "activa"
  },
  "admins": [
    { "email": "admin1.9001234567@techcorp.com", "nombre": "Administrador 1 — Tech Corp S.A.S" },
    { "email": "admin2.9001234567@techcorp.com", "nombre": "Administrador 2 — Tech Corp S.A.S" }
  ]
}
```

**PATCH `/api/super-admin/empresas/:id/estado`**
```json
// Request
{ "estado": "suspendida" }

// Response 200
{ "id": 1, "estado": "suspendida", "updated_at": "2026-05-07T15:30:00.000Z" }
```

**POST `/api/super-admin/empresas/:id/admins`**
```json
// Request
{ "nombre": "María López", "email": "maria.lopez@techcorp.com" }

// Response 201 — admin creado en Auth Service y credenciales enviadas por email

// Response 409 — empresa ya tiene 2 admins activos
{ "error": "La empresa ya tiene el máximo de 2 administradores activos." }
```

**GET `/api/super-admin/empresas/:id/empleados`**
```json
// Response 200
[
  {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "estado": "activo",
    "detalle_estado": "Trabajando actualmente"
  },
  {
    "id": 2,
    "nombre": "Ana",
    "apellido": "García",
    "estado": "retirado",
    "detalle_estado": "Ya no forma parte de la empresa"
  }
]
```

---

## 8. Flujos de negocio

### Crear empresa con admins automáticos

```
POST /api/super-admin/empresas
  1. Verificar JWT super admin
  2. Validar NIT único en BD
  3. INSERT en empresas
  4. Para i = 1..2:
     a. Generar contraseña temporal aleatoria
     b. Construir email: admin{i}.{nit_limpio}@{dominio_empresa}
     c. POST a Auth Service /auth/register (rol: 'admin')
     d. INSERT en admins_empresa
     e. Enviar email con credenciales al correo de la empresa
  5. Retornar 201 con { empresa, admins }
  ⚠ Si falla la creación de un admin, se loguea el error y se continúa
```

### Login y refresh token

```
POST /api/super-admin/login
  1. Buscar super admin por email
  2. bcrypt.compare(password, password_hash)
  3. Si falla: registrar intento fallido en History (fire-and-forget) → 401
  4. Generar access_token (JWT, expira en JWT_EXPIRES_IN)
  5. Generar refresh_token (crypto.randomBytes → SHA-256 almacenado)
  6. INSERT en refresh_tokens_superadmin
  7. Registrar login exitoso en History (fire-and-forget)
  8. Retornar { access_token, refresh_token, expires_in }

POST /api/super-admin/refresh
  1. SHA-256(refresh_token del body) → buscar en BD
  2. Verificar: no revocado, no expirado
  3. Revocar el refresh token actual
  4. Generar nuevo access_token y nuevo refresh_token (rotación)
  5. Retornar nuevos tokens
```

### Recuperación de contraseña

```
POST /api/super-admin/recover-password
  1. Buscar super admin por email
  2. Si no existe → retornar 200 con mensaje genérico (anti-enumeración)
  3. Generar token aleatorio → guardar SHA-256 en BD con TTL (RESET_TOKEN_EXPIRES_MINUTES)
  4. Enviar email con enlace: {FRONTEND_URL}/reset-password?token=<token_en_claro>

POST /api/super-admin/reset-password
  1. SHA-256(token del body) → buscar en BD
  2. Verificar que no haya expirado
  3. bcrypt.hash(nueva contraseña)
  4. UPDATE super_admins SET password_hash, reset_token=NULL, reset_token_expires=NULL
  5. Revocar TODOS los refresh tokens del super admin
  6. Retornar 200
```

---

## 9. Seguridad y autenticación

### Tokens JWT

- Los JWTs llevan `{ id, email, rol: 'super_admin' }` en el payload.
- El middleware `verifySuperAdminToken` verifica la firma y que `rol === 'super_admin'`.
- Los tokens son stateless y expiran en `JWT_EXPIRES_IN` (default: 1h).

### Refresh tokens

- Se almacenan como **SHA-256 del token en claro** — nunca el token en texto plano.
- Cada renovación **rota** el refresh token (el anterior se revoca).
- Al resetear contraseña se revocan **todos** los refresh tokens del usuario.

### Bootstrap register

- `POST /api/super-admin/register` requiere el header `X-Register-Secret: <REGISTER_SECRET>`.
- Sin este header devuelve `401`. Nunca exponer este endpoint al público.

### Contraseñas

- Bcrypt con **12 rounds** para passwords de super admins.
- Las contraseñas temporales de admins de empresa se generan con `crypto.randomBytes` y se envían por correo.

### Correos HTML

- Todos los valores de usuario se pasan por `escapeHtml()` antes de insertarlos en las plantillas HTML, previniendo inyección XSS en el body del correo.

---

## 10. Conexiones con otros microservicios

```
┌──────────────────────────────────────────────────────────────┐
│                    super-admin-service :3007                 │
│                                                              │
│  authClient ──────────────────────────► auth-service :3001  │
│  (POST /auth/register al crear empresa)                      │
│                                                              │
│  employeeClient ───────────────────────► employee-service :3002│
│  (GET /empleados al listar empleados de empresa)             │
│                                                              │
│  historyClient ────────────────────────► history-service :3006│
│  (fire-and-forget: logins, acciones)                         │
│  (GET: consulta de auditoría global)                         │
└──────────────────────────────────────────────────────────────┘
```

| Cliente             | Servicio destino      | Operaciones                                              |
|---------------------|-----------------------|----------------------------------------------------------|
| `authClient`        | Auth Service :3001    | `registrarUsuario` — crea admins de empresa              |
| `employeeClient`    | Employee Service :3002| `getEmpleados` — lista empleados de una empresa          |
| `historyClient`     | History Service :3006 | `registrarAccion` (fire-and-forget), `obtenerAcciones`, `obtenerCambios` |

### Fire-and-forget

El `historyClient.registrarAccion()` nunca bloquea la operación principal. Si el History Service no responde, se loguea un warning y la operación continúa con éxito:

```typescript
// historyClient.ts
export const registrarAccion = async (datos: RegistrarAccionDto): Promise<void> => {
  axios.post(`${env.historyServiceUrl}/api/historial/acciones`, datos)
    .catch((err) => console.warn('[HistoryClient] No se pudo registrar acción:', err.message));
  // Void — no await, no throw
};
```

---

## 11. Arquitectura en capas

```
Request HTTP
    │
    ▼
routes/          ← define método + path + middlewares
    │
    ▼
middlewares/     ← verifyToken, validateBody(Zod), errorHandler
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

services/ también llama a →  clients/  →  otros microservicios
```

**Regla:** ninguna capa salta a otra no adyacente. El controller no toca la BD. El repository no tiene lógica de negocio.

---

## 12. Manejo de errores

Todas las rutas usan `asyncHandler` para capturar rechazos de promesas:

```typescript
// asyncHandler evita try/catch en cada controller
router.get('/', asyncHandler(async (req, res) => {
  const data = await empresaService.listar();
  res.json(data);
}));
```

El `errorHandler` middleware centraliza las respuestas de error:

| Clase de error        | Status | `code` en respuesta      |
|-----------------------|--------|--------------------------|
| `AppError`            | Custom | `code` del constructor   |
| `UnauthorizedError`   | 401    | `UNAUTHORIZED`           |
| `NotFoundError`       | 404    | `NOT_FOUND`              |
| `ConflictError`       | 409    | `CONFLICT`               |
| Error desconocido     | 500    | `INTERNAL_SERVER_ERROR`  |

En `NODE_ENV=development` la respuesta incluye el stack trace.

Formato de respuesta de error:
```json
{
  "error": "Mensaje legible para el usuario",
  "code": "MAX_ADMINS_REACHED",
  "details": { "campo": "descripción" }
}
```

---

## 13. Ejecución con Docker

### Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3007
CMD ["node", "dist/server.js"]
```

### Docker Compose (fragmento relevante)

```yaml
super-admin-service:
  build: ./super-admin-service
  ports:
    - "3007:3007"
  environment:
    NODE_ENV: production
    PORT: 3007
    DATABASE_URL: postgres://postgres:password@postgres-superadmin:5432/superadmin_db
    JWT_SECRET: ${SUPER_ADMIN_JWT_SECRET}
    REGISTER_SECRET: ${SUPER_ADMIN_REGISTER_SECRET}
    AUTH_SERVICE_URL: http://auth-service:3001/api/v1
    EMPLOYEE_SERVICE_URL: http://employee-service:3002/api
    HISTORY_SERVICE_URL: http://history-service:3006
  depends_on:
    - postgres-superadmin
    - auth-service
    - employee-service
    - history-service
```

Las migraciones se ejecutan automáticamente en el `CMD` del contenedor (el `server.ts` llama a `connectDatabase` que verifica la conexión; las migraciones se aplican vía `npm run migrate` como paso previo en el entrypoint si así está configurado en Compose).

---

## 14. Testing

### Configuración

El proyecto usa **Vitest** con cobertura via `@vitest/coverage-v8`.

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar en modo watch (re-run al guardar)
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

### Estructura de tests

```
tests/
├── setup.ts                          # Configuración global de Vitest
└── unit/
    ├── services/
    │   ├── auth.service.test.ts      # Login, refresh, logout, recover/reset
    │   └── empresa.service.test.ts   # CRUD empresas, max admins, empleados
    ├── controllers/
    │   ├── auth.controller.test.ts
    │   └── empresa.controller.test.ts
    ├── middlewares/
    │   ├── auth.middleware.test.ts   # verifySuperAdminToken, verifyRegisterSecret
    │   ├── error-handler.middleware.test.ts
    │   └── validation.middleware.test.ts
    ├── utils/
    │   ├── jwt.util.test.ts
    │   ├── crypto.util.test.ts
    │   └── async-handler.util.test.ts
    ├── clients/
    │   └── historyClient.test.ts     # fire-and-forget, no-throw, console.warn
    └── shared/errors/
        └── app-error.test.ts
```

### Patrones de testing usados

- `vi.mock()` para aislar dependencias externas (pg Pool, axios, nodemailer, jsonwebtoken)
- El `EmailService` acepta un `Transporter` inyectado en el constructor para facilitar el testeo sin SMTP real
- El `historyClient` se testea verificando que nunca lanza aunque axios rechace
- Los tests de middlewares usan objetos `req/res/next` simulados manualmente

### Cobertura objetivo

| Métrica    | Umbral mínimo |
|------------|---------------|
| Lines      | 80%           |
| Functions  | 80%           |
| Branches   | 70%           |
| Statements | 80%           |

Los reportes de cobertura se generan en `coverage/` en formatos `text`, `html` y `lcov` (para SonarCloud).

---

## Scripts disponibles

| Script                | Descripción                                      |
|-----------------------|--------------------------------------------------|
| `npm run dev`         | Desarrollo con hot-reload (`ts-node-dev`)        |
| `npm run build`       | Compilar TypeScript a `dist/`                    |
| `npm start`           | Ejecutar build compilado                         |
| `npm test`            | Ejecutar suite de pruebas                        |
| `npm run test:watch`  | Pruebas en modo watch                            |
| `npm run test:coverage` | Pruebas con reporte de cobertura              |
| `npm run migrate`     | Aplicar migraciones pendientes                   |
| `npm run migrate:down`| Revertir la última migración                     |
| `npm run lint`        | Verificar estilo con ESLint                      |
| `npm run format`      | Formatear código con Prettier                    |
