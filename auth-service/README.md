# Auth Service

> Microservicio 1 de 7 · Puerto **3001** · Base de datos: `auth_db`

Sistema de autenticación basado en JWT + Refresh Tokens con revocación real de sesiones, rotación de tokens, bcrypt para contraseñas, recuperación de contraseña por correo y control de acceso por roles.

---

## Tabla de Contenido

1. [Responsabilidades](#1-responsabilidades)
2. [Tech Stack](#2-tech-stack)
3. [Estructura de Carpetas](#3-estructura-de-carpetas)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Migraciones](#5-migraciones)
6. [API Endpoints](#6-api-endpoints)
7. [Flujos de Autenticación](#7-flujos-de-autenticación)
8. [Variables de Entorno](#8-variables-de-entorno)
9. [Roles y Permisos](#9-roles-y-permisos)
10. [Seguridad](#10-seguridad)
11. [Integración con otros Microservicios](#11-integración-con-otros-microservicios)
12. [Cómo Ejecutar](#12-cómo-ejecutar)
13. [Pruebas](#13-pruebas)
14. [Diagrama de Flujo](#14-diagrama-de-flujo)

---

## 1. Responsabilidades

| Función | Descripción |
|---------|-------------|
| Registro de usuarios | Hasheo bcrypt + validación de correo real (SMTP check) + almacenamiento seguro |
| Verificación de email | Flujo completo con token de un solo uso (TTL 24 h) enviado por correo al registrar |
| Login | Verificación de credenciales + emisión de access_token + refresh_token |
| Access Token | JWT firmado con payload `{ sub, email, role, employeeId? }` (employeeId incluido para CONSULTATION), expira en 1h |
| Refresh Token | Token opaco (128 hex chars), almacenado como SHA-256 en BD, expira en 7 días |
| Rotación de tokens | Cada renovación genera un nuevo par y revoca el anterior |
| Logout real | Revoca el refresh_token en BD → sesión inválida de inmediato |
| Logout global | Revoca TODOS los refresh_tokens del usuario |
| Recuperación de contraseña | Flujo completo forgot/reset vía token de un solo uso (15 min) |
| Cambio de contraseña | Cambio autenticado verificando contraseña actual + revoca todas las sesiones |
| Gestión de usuarios | CRUD básico con activación/desactivación por rol ADMIN |
| Notificaciones por email | Alerta de login, cambios de empleados y solicitudes de corrección vía Gmail SMTP |
| Preferencias de usuario | Configuración de notificaciones por correo (`notif_login`, `notif_cambios`) |
| Endpoints internos | Recibe eventos de employee-service y los reenvía por email (protegidos por API key en middleware) |
| Middleware reutilizable | `authenticate` + `authorize` exportables a otros servicios |

---

## 2. Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18 + TypeScript 5 |
| Framework | Express.js v5 |
| Base de datos | PostgreSQL 14+ con `pg` (sin ORM) |
| Migraciones | node-pg-migrate (TypeScript) |
| Autenticación | jsonwebtoken |
| Contraseñas | bcrypt (12 salt rounds) |
| Validación | Zod v4 |
| Email | nodemailer + Gmail SMTP (App Password) |
| HTTP Client | axios (llamadas fire-and-forget) |
| Pruebas | Jest + ts-jest |
| Linting | ESLint + Prettier |
| Contenedor | Docker |

---

## 3. Estructura de Carpetas

```
auth-service/
├── migrations/
│   ├── 001_create_users.ts
│   ├── 002_create_refresh_tokens.ts
│   ├── 1777862763125_create-password-reset-tokens.ts
│   ├── 1778200000000_add-notification-prefs.ts
│   └── (migración email_verified + email_verifications)  # ver sección 4
├── src/
│   ├── clients/
│   │   ├── employeeServiceClient.ts  # Consulta empleados en Employee Service
│   │   └── historyServiceClient.ts   # Fire-and-forget eventos a History Service
│   ├── config/
│   │   ├── database.ts              # Pool de conexión pg + healthcheck
│   │   └── env.ts                   # Variables de entorno validadas al arranque
│   ├── controllers/
│   │   ├── auth.controller.ts       # register, login, refresh, logout, logout-all,
│   │   │                            #   forgotPassword, resetPassword, verifyEmail,
│   │   │                            #   getPreferences, updatePreferences
│   │   ├── internal.controller.ts   # notifyEmployeeChange, notifyCorrectionRequest
│   │   └── user.controller.ts       # findAll, findById, activate, deactivate,
│   │                                #   getProfile, changePassword
│   ├── dtos/
│   │   ├── create-user.dto.ts
│   │   └── login.dto.ts
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── refresh-token.entity.ts
│   │   ├── password-reset-token.entity.ts
│   │   ├── email-verification.entity.ts  # entidad para verificación de email
│   │   └── role.entity.ts               # Enum RoleName
│   ├── middlewares/
│   │   ├── auth.middleware.ts        # authenticate — verifica JWT
│   │   ├── authorize.middleware.ts   # authorize — valida rol
│   │   ├── error-handler.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   └── validate-request.middleware.ts
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   ├── user-repository.interface.ts
│   │   │   ├── refresh-token-repository.interface.ts
│   │   │   ├── password-reset-token-repository.interface.ts
│   │   │   └── email-verification-repository.interface.ts
│   │   ├── user.repository.ts
│   │   ├── refreshToken.repository.ts
│   │   ├── password-reset-token.repository.ts
│   │   └── email-verification.repository.ts  # repositorio de tokens de verificación
│   ├── routes/
│   │   ├── auth.routes.ts            # /api/v1/auth/*
│   │   ├── user.routes.ts            # /api/v1/users/*
│   │   ├── health.routes.ts          # /api/v1/health
│   │   ├── protected.routes.ts       # /api/v1/protected/*
│   │   ├── internal.routes.ts        # /api/v1/internal/* (valida x-internal-key a nivel router)
│   │   └── index.ts
│   ├── schemas/
│   │   └── auth.schema.ts            # Esquemas Zod para todos los endpoints
│   ├── services/
│   │   ├── interfaces/
│   │   │   ├── auth-service.interface.ts
│   │   │   ├── user-service.interface.ts
│   │   │   └── email-service.interface.ts
│   │   ├── email/
│   │   │   └── smtp-email.service.ts  # SmtpEmailService + ConsoleEmailService (fallback dev)
│   │   ├── auth.service.ts
│   │   └── user.service.ts
│   ├── shared/
│   │   └── errors/
│   │       ├── app-error.ts
│   │       ├── conflict.error.ts      # 409
│   │       ├── forbidden.error.ts     # 403
│   │       ├── not-found.error.ts     # 404
│   │       ├── request-validation.error.ts # 400
│   │       └── unauthorized.error.ts  # 401
│   ├── utils/
│   │   ├── async-handler.util.ts     # wrapper asyncHandler para controllers
│   │   ├── email-domain.util.ts      # validateEmailDomain — SMTP MX check
│   │   ├── jwt.util.ts               # generateJwtToken, verifyJwtToken
│   │   ├── logger.util.ts            # logger centralizado
│   │   ├── password.util.ts          # hashPassword, comparePassword
│   │   └── token.util.ts             # generateRefreshToken, hashToken
│   ├── app.ts
│   └── server.ts
├── tests/
│   └── auth.service.test.ts
├── .env.example
├── Dockerfile
├── jest.config.ts
├── tsconfig.json
└── tsconfig.build.json
```

---

## 4. Modelo de Datos

### Tabla `users`

```sql
CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20)  NOT NULL
                  CHECK (role IN ('ADMIN', 'HR', 'CONSULTATION')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,  -- se pone TRUE al confirmar el link de verificación
  last_login      TIMESTAMP(6),
  notif_login     BOOLEAN NOT NULL DEFAULT TRUE,
  notif_cambios   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 del token opaco
  expires_at  TIMESTAMP(6) NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  ip_origin   VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id   ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash      ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_revocado  ON refresh_tokens(revoked, expires_at);
```

### Tabla `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,  -- SHA-256 del token en claro
  expires_at  TIMESTAMP(6) NOT NULL,  -- TTL: RESET_TOKEN_EXPIRES_MINUTES
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `email_verifications`

```sql
CREATE TABLE email_verifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,   -- SHA-256 del token enviado por correo
  expires_at  TIMESTAMP(6) NOT NULL,   -- TTL: EMAIL_VERIFICATION_EXPIRES_MINUTES (default 24 h)
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Relaciones

```
users (1) ─── (N) refresh_tokens
  id                user_id FK CASCADE
  email             token_hash SHA-256
  password_hash     expires_at
  role              revoked
  notif_login
  notif_cambios

users (1) ─── (N) password_reset_tokens
  id                user_id FK CASCADE
                    token_hash SHA-256
                    expires_at (15 min por defecto)
                    used (true al usar — token de un solo uso)

users (1) ─── (N) email_verifications
  id                user_id FK CASCADE
                    token_hash SHA-256
                    expires_at (EMAIL_VERIFICATION_EXPIRES_MINUTES)
                    used (true al consumirse — token de un solo uso)
```

---

## 5. Migraciones

```bash
npm run migrate        # Aplica migraciones pendientes
npm run migrate:down   # Revierte la última migración
```

Orden de ejecución:

```
001_create_users.ts                           → tabla users + índices
002_create_refresh_tokens.ts                  → tabla refresh_tokens + FK
1777862763125_create-password-reset-tokens.ts → tabla password_reset_tokens
1778200000000_add-notification-prefs.ts       → columnas notif_login y notif_cambios en users
(migración email_verified)                    → columna email_verified en users (DEFAULT FALSE)
(migración email_verifications)               → tabla email_verifications + FK
```

Las migraciones son idempotentes. En Docker corren automáticamente al arrancar el contenedor.

---

## 6. API Endpoints

Base path: `/api/v1`

### Autenticación — `/auth`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Registrar usuario (con validación de correo real) | ❌ |
| POST | `/auth/login` | Login → access_token + refresh_token | ❌ |
| POST | `/auth/refresh` | Renovar tokens (rotación: nuevo par, revoca anterior) | ❌ |
| POST | `/auth/logout` | Revocar refresh_token actual | ❌ (body: refreshToken) |
| POST | `/auth/logout-all` | Revocar TODOS los refresh_tokens del usuario | ✅ JWT |
| POST | `/auth/forgot-password` | Solicitar recuperación por email (anti-enumeración) | ❌ |
| POST | `/auth/reset-password` | Restablecer contraseña con token de 15 min | ❌ |
| GET  | `/auth/verify-email` | Verificar email con token recibido por correo (`?token=`) | ❌ |

### Usuarios — `/users`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/users` | Listar todos los usuarios | ADMIN |
| GET | `/users/:id` | Detalle de un usuario | ADMIN, HR |
| PATCH | `/users/:id/activate` | Activar usuario | ADMIN |
| PATCH | `/users/:id/deactivate` | Desactivar usuario | ADMIN |

### Rutas protegidas — `/protected`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/protected/me` | Datos del usuario del JWT | ✅ JWT |
| GET | `/protected/profile` | Perfil completo del usuario autenticado | ✅ JWT |
| POST | `/protected/change-password` | Cambiar contraseña (requiere actual) | ✅ JWT |
| GET | `/protected/preferences` | Preferencias de notificación | ✅ JWT |
| PATCH | `/protected/preferences` | Actualizar preferencias | ✅ JWT |
| GET | `/protected/admin-only` | Acceso solo ADMIN | ✅ JWT |
| GET | `/protected/hr-or-admin` | Acceso HR o ADMIN | ✅ JWT |

### Rutas internas — `/internal`

> Solo accesibles entre microservicios. Requieren header `x-internal-key: <INTERNAL_API_KEY>`.
> La validación del header se aplica como middleware en el router — cualquier ruta nueva queda automáticamente protegida.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/internal/notify-employee-change` | Recibe evento de employee-service y envía email al usuario |
| POST | `/internal/notify-correction-request` | Recibe solicitud de corrección y envía email a todos los ADMIN y HR activos |

### Salud

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Estado del servicio y conexión a BD |

---

### Ejemplos de request / response

**POST `/api/v1/auth/login`**
```json
// Request
{ "email": "admin@empresa.com", "password": "MiContraseña#123" }

// Response 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "a3f9d2c1...",
  "user": { "id": 1, "email": "admin@empresa.com", "role": "ADMIN" }
}
```

**POST `/api/v1/auth/refresh`**
```json
// Request
{ "refreshToken": "a3f9d2c1..." }

// Response 200 — nuevo par de tokens (rotación)
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "b7e4f1d9..."
}

// Response 401 — token revocado o expirado
{ "error": "Token inválido o revocado", "code": "UNAUTHORIZED" }
```

**POST `/api/v1/auth/forgot-password`**
```json
// Request
{ "email": "usuario@empresa.com" }

// Response 200 — siempre igual (anti-enumeración)
{ "message": "If the email exists, a recovery link was sent" }
```

**POST `/api/v1/auth/reset-password`**
```json
// Request
{ "token": "token_recibido_por_email", "newPassword": "NuevaContraseña#456" }

// Response 200
{ "message": "Password reset successfully" }

// Response 401 — token expirado o ya usado
{ "error": "Token inválido o expirado", "code": "UNAUTHORIZED" }
```

**PATCH `/api/v1/protected/preferences`**
```json
// Request
{ "notif_login": false, "notif_cambios": true }

// Response 200
{ "notif_login": false, "notif_cambios": true }
```

---

## 7. Flujos de Autenticación

### Registro

```
POST /api/v1/auth/register
  1. Validar body con Zod (validateRequest middleware)
  2. Normalizar email → lowercase.trim()
  3. Verificar que el email no exista en BD
  4. Verificar que el correo sea real (SMTP check)
     → Si no existe: 400 "El correo electrónico no es válido o no existe"
  5. Si role='CONSULTATION':
     → Verificar que el correo exista como empleado en Employee Service
     → Si no existe: 403 "El rol consulta requiere estar registrado como empleado"
     → Obtener employeeId del empleado para incluirlo en JWTs futuros
  6. bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
  7. Generar email_verification token (SHA-256 de un random)
  8. INSERT en users
  9. Enviar email de verificación con link: {FRONTEND_URL}/verify-email?token=<token_en_claro>
  10. Retornar 201 { id, firstName, lastName, email, role, isActive, emailVerified }
      (nunca se retorna el password_hash)
```

### Login

```
POST /api/v1/auth/login
  1. Buscar usuario por email
  2. Verificar is_active = true y email_verified = true
  3. bcrypt.compare(password, password_hash)
  4. Si falla → registrar intento fallido en History (fire-and-forget) → 401
  5. Generar access_token: JWT firmado (exp: JWT_EXPIRES_IN)
     Payload: { sub: userId, email, role }
     Para role=CONSULTATION: { sub, email, role, employeeId } (obtenido de Employee Service)
  6. Generar refresh_token: crypto.randomBytes(64).toString('hex')
  7. Guardar SHA-256(refresh_token) en refresh_tokens con ip_origin y user_agent
  8. UPDATE users.last_login = NOW()
  9. Registrar 'login' exitoso en History Service (fire-and-forget)
  10. Si notif_login = true → enviar email de alerta de inicio de sesión
  11. Retornar 200 { accessToken, refreshToken, user }
```

### Refresh (rotación de token)

```
POST /api/v1/auth/refresh
  1. Calcular SHA-256(refreshToken del body)
  2. Buscar en refresh_tokens por token_hash
  3. Verificar: existe, revoked=false, expires_at > ahora
  4. Buscar usuario → verificar is_active = true
  5. Revocar el refresh_token actual (UPDATE revoked=TRUE)
  6. Generar nuevo access_token (JWT)
     Payload: { sub, email, role }
     Para role=CONSULTATION: { sub, email, role, employeeId } (obtenido de Employee Service)
  7. Generar nuevo refresh_token + guardar SHA-256 en BD
  8. Registrar 'token_renovado' en History (fire-and-forget)
  9. Retornar 200 { accessToken, refreshToken }
  10. Si cualquier verificación falla → 401 Unauthorized
```

### Logout

```
POST /api/v1/auth/logout
  Body: { refreshToken }
  1. SHA-256(refreshToken) → UPDATE refresh_tokens SET revoked=TRUE
  2. Registrar 'logout' en History (fire-and-forget)
  3. Retornar 200 { message: 'Session closed successfully' }

POST /api/v1/auth/logout-all
  Headers: Authorization: Bearer <access_token>
  1. authenticate middleware extrae userId del JWT
  2. UPDATE refresh_tokens SET revoked=TRUE WHERE user_id = $1
  3. Registrar 'logout_all' en History (fire-and-forget)
  4. Retornar 200 { message: 'All sessions closed successfully' }
```

### Recuperación de contraseña

```
POST /api/v1/auth/forgot-password
  1. Buscar usuario por email
  2. Si no existe → retornar 200 con mensaje genérico (anti-enumeración)
  3. Generar token aleatorio (crypto.randomBytes)
  4. Guardar SHA-256(token) en password_reset_tokens con TTL (RESET_TOKEN_EXPIRES_MINUTES)
  5. Enviar email: {FRONTEND_URL}/reset-password?token=<token_en_claro>
  6. Retornar 200 { message: 'If the email exists, a recovery link was sent' }

POST /api/v1/auth/reset-password
  1. SHA-256(token del body) → buscar en password_reset_tokens
  2. Verificar: existe, used=false, expires_at > ahora
  3. Verificar que el usuario asociado esté activo
  4. bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS)
  5. UPDATE users SET password_hash = $1
  6. UPDATE password_reset_tokens SET used = TRUE
  7. Revocar TODOS los refresh_tokens del usuario (seguridad)
  8. Retornar 200 { message: 'Password reset successfully' }
```

### Cambio de contraseña autenticado

```
POST /api/v1/protected/change-password
  Headers: Authorization: Bearer <access_token>
  Body: { currentPassword, newPassword }
  1. authenticate middleware extrae userId del JWT
  2. Buscar usuario → bcrypt.compare(currentPassword, password_hash)
  3. Si no coincide → 401 Unauthorized
  4. bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS)
  5. UPDATE users SET password_hash = $1
  6. Revocar TODOS los refresh_tokens del usuario (cierra todas las sesiones activas)
  7. Retornar 200 { message: 'Password changed successfully' }
```

### Verificación de email

```
GET /api/v1/auth/verify-email?token=<token_en_claro>
  1. SHA-256(token del query param) → buscar en email_verifications
  2. Verificar: existe, used=false, expires_at > ahora
  3. UPDATE users SET email_verified = TRUE
  4. UPDATE email_verifications SET used = TRUE
  5. Retornar 200 { message: 'Email verified successfully' }
  6. Si el token es inválido/expirado/ya usado → 401 Unauthorized

El flujo completo de registro incluye:
  - register() crea usuario con email_verified = FALSE
  - Se envía un correo con el link: {FRONTEND_URL}/verify-email?token=<token_en_claro>
  - El token se almacena como SHA-256 en email_verifications con TTL (EMAIL_VERIFICATION_EXPIRES_MINUTES)
  - El usuario hace click en el link → GET /auth/verify-email → email_verified = TRUE
```

---

## 8. Variables de Entorno

```env
# Aplicación
NODE_ENV=development
PORT=3001
SERVICE_NAME=auth-service

# Base de datos
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db

# JWT
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7

# Contraseñas
BCRYPT_SALT_ROUNDS=12

# Recuperación de contraseña
RESET_TOKEN_EXPIRES_MINUTES=15
FRONTEND_URL=http://localhost:5173

# Verificación de email
EMAIL_VERIFICATION_EXPIRES_MINUTES=1440   # 24 horas por defecto

# Comunicación entre servicios
EMPLOYEE_SERVICE_URL=http://localhost:3002
HISTORY_SERVICE_URL=http://localhost:3006
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion
CORS_ORIGINS=http://localhost:5173

# SMTP (Gmail con App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # App Password de 16 chars, no la contraseña de Gmail
SMTP_FROM=tu-correo@gmail.com
```

> Si `SMTP_USER` o `SMTP_PASS` están vacíos, el servicio usa `ConsoleEmailService` (imprime correos en consola). Útil para desarrollo sin SMTP real configurado.

---

## 9. Roles y Permisos

| Rol | Valor en BD | Acceso |
|-----|-------------|--------|
| Administrador | `ADMIN` | CRUD completo, gestión de usuarios |
| Recursos Humanos | `HR` | Consulta de usuarios, operaciones de empleados |
| Consultante | `CONSULTATION` | Solo lectura de su propia información |

El rol se guarda en la columna `role` de `users`. No hay tabla separada de roles. Los demás microservicios validan el rol **localmente** desde el JWT — sin llamadas HTTP al Auth Service.

---

## 10. Seguridad

- Contraseñas hasheadas con **bcrypt** (configurable, default 12 rounds). Nunca en texto plano.
- Refresh tokens almacenados como **SHA-256** — nunca el token en claro.
- **Rotación** de refresh tokens: cada renovación genera un par nuevo y revoca el anterior.
- Reset de contraseña revoca **todos** los refresh tokens activos del usuario.
- **Cambio de contraseña** también revoca todos los refresh tokens activos (cierra todas las sesiones).
- Token de recuperación de **un solo uso** (`used=TRUE` al consumirse) con TTL de 15 min.
- Token de verificación de email de **un solo uso** con TTL configurable (default 24 h).
- **Anti-enumeración** en forgot-password: misma respuesta exista o no el email.
- Correos HTML con valores de usuario pasados por `escapeHtml()` (previene XSS en plantillas).
- JWT firmado con secret ≥ 32 caracteres, validado localmente por cada microservicio.
- `INTERNAL_API_KEY` protege **todas** las rutas `/internal/*` mediante middleware a nivel de router.
- Respuestas de error en `NODE_ENV=production` sin stack trace ni mensajes internos.

> **Nota sobre el JWT y usuarios desactivados:** El middleware `authenticate` verifica únicamente
> la firma y expiración del JWT, sin consultar la BD. Si un usuario es desactivado, su access token
> sigue siendo válido hasta que expire (máximo `JWT_EXPIRES_IN`, default 1 h). Esto es una decisión
> de diseño para mantener el sistema stateless.

---

## 11. Integración con otros Microservicios

### Validación JWT en otros servicios

```
Cliente → Employee/Contract/Vacation/Report Service
  Authorization: Bearer <JWT>
  → verifyJwtToken(token, JWT_SECRET) — local, sin HTTP al Auth Service
  → req.user = { sub, email, role }
```

### → Employee Service (puerto 3002)

Cuando el rol del nuevo usuario es `CONSULTATION`, el Auth Service consulta si el correo existe como empleado antes de crearlo:

```
POST /api/v1/auth/register (role: 'CONSULTATION')
  → GET http://employee-service:3002/api/empleados?correo=<email>
  → Si no existe → 403
```

### ← Employee Service (puerto 3002) — notificaciones

Employee Service llama a los endpoints internos tras cada operación. Auth Service recibe la solicitud y envía emails según las preferencias del usuario:

```
employee-service → POST /api/v1/internal/notify-employee-change
  Header: x-internal-key: <INTERNAL_API_KEY>
  Body: { userEmail, action, employeeName }
  → Si el usuario tiene notif_cambios=true, envía email de notificación de cambio
  (fire-and-forget desde employee-service)

employee-service → POST /api/v1/internal/notify-correction-request
  Header: x-internal-key: <INTERNAL_API_KEY>
  Body: { empleadoNombre, descripcion, solicitante }
  → Envía email de solicitud de corrección a TODOS los usuarios ADMIN y HR activos
  (fire-and-forget desde employee-service)
```

### → History Service (puerto 3006)

Fire-and-forget en cada evento de autenticación. Si History Service no responde, el flujo principal continúa sin errores:

```
login exitoso     → POST /api/historial/acciones { accion: 'login',         resultado: 'exitoso' }
login fallido     → POST /api/historial/acciones { accion: 'login',         resultado: 'fallido' }
logout            → POST /api/historial/acciones { accion: 'logout',        resultado: 'exitoso' }
logout_all        → POST /api/historial/acciones { accion: 'logout_all',    resultado: 'exitoso' }
token_renovado    → POST /api/historial/acciones { accion: 'token_renovado', resultado: 'exitoso' }
```

---

## 12. Cómo Ejecutar

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ con base de datos `auth_db` creada

```bash
psql -U postgres -c "CREATE DATABASE auth_db;"
```

### Desarrollo local

```bash
npm install
cp .env.example .env
# Editar .env con valores reales

npm run migrate
npm run dev
# → http://localhost:3001
```

### Producción

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t auth-service .
docker run -p 3001:3001 --env-file .env auth-service
```

---

## 13. Pruebas

```bash
npm test                  # Ejecutar todas las pruebas
npm run test:watch        # Modo watch
npm run test:coverage     # Con reporte de cobertura
```

### Cobertura objetivo: 60% mínimo (SonarCloud)

### Casos cubiertos

| ID | Caso | Tipo |
|----|------|------|
| TC-AUTH-001 | Login exitoso → access_token + refresh_token | Positivo |
| TC-AUTH-002 | Login con contraseña incorrecta → 401 | Negativo |
| TC-AUTH-003 | Refresh válido → nuevo par de tokens (rotación) | Positivo |
| TC-AUTH-004 | Refresh revocado → 401 | Negativo |
| TC-AUTH-005 | Refresh expirado → 401 | Negativo |
| TC-AUTH-006 | Logout revoca el refresh_token | Positivo |
| TC-AUTH-007 | Logout-all revoca todos los tokens del usuario | Positivo |
| TC-AUTH-008 | Endpoint protegido sin token → 401 | Negativo |
| TC-AUTH-009 | Registro con correo inexistente → 400 | Negativo |
| TC-AUTH-010 | Registro con rol CONSULTATION sin ser empleado → 403 | Negativo |
| TC-AUTH-011 | Reset password con token expirado → 401 | Negativo |
| TC-AUTH-012 | Reset password con token ya usado → 401 | Negativo |
| TC-AUTH-013 | Change password con contraseña actual incorrecta → 401 | Negativo |
| TC-AUTH-014 | Forgot password → respuesta genérica (anti-enumeración) | Positivo |
| TC-AUTH-015 | Usuario inactivo no puede hacer login → 401 | Negativo |

---

## 14. Diagrama de Flujo

### Ciclo completo de autenticación

```
Cliente                    Auth Service                  Base de Datos
  │                             │                              │
  │── POST /auth/register ─────►│                              │
  │   { firstName, lastName,     │── INSERT users ────────────►│
  │     email, password, role }  │◄─ { id, email, role } ──────│
  │◄── 201 { user } ────────────│                              │
  │                             │                              │
  │── POST /auth/login ─────────►│                              │
  │   { email, password }        │── SELECT users WHERE email ─►│
  │                             │◄─ user row ──────────────────│
  │                             │── bcrypt.compare (local)      │
  │                             │── INSERT refresh_tokens ─────►│
  │                             │── UPDATE last_login ──────────►│
  │◄── 200 { accessToken,       │                              │
  │         refreshToken, user }│                              │
  │                             │                              │
  │  (access expira en 1h)       │                              │
  │                             │                              │
  │── POST /auth/refresh ───────►│                              │
  │   { refreshToken }           │── SELECT refresh_tokens ────►│
  │                             │◄─ token record ──────────────│
  │                             │── verificar !revoked, !exp    │
  │                             │── UPDATE revoked=TRUE ────────►│  ← revoca el anterior
  │                             │── INSERT nuevo refresh_token ─►│  ← nuevo token
  │◄── 200 { accessToken,       │                              │
  │         refreshToken }      │                              │
  │                             │                              │
  │── POST /auth/logout ────────►│                              │
  │   { refreshToken }           │── UPDATE revoked=TRUE ────────►│
  │◄── 200 { message } ─────────│                              │
```

### Validación JWT en otros microservicios (stateless, sin HTTP)

```
Cliente → Employee/Contract/Vacation/Report Service
  Authorization: Bearer <JWT>
       │
       ▼
  verifyJwtToken(token, JWT_SECRET_compartido)
       │
       ├── ✅ válido → req.user = { sub, email, role } → continúa
       └── ❌ inválido/expirado → 401 Unauthorized
       
  (sin llamada HTTP al Auth Service — validación local en cada servicio)
```