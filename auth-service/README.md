# Auth Service — Microservicio de Autenticación y Autorización

> Microservicio 1 de 5 · Puerto 3001 · Base de datos: `auth_db`

Sistema de autenticación basado en JWT + Refresh Tokens con revocación real de sesiones, bcrypt para contraseñas y control de acceso por roles.

---

## Tabla de Contenido

1. [Responsabilidades](#responsabilidades)
2. [Tech Stack](#tech-stack)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Modelo de Datos](#modelo-de-datos)
5. [Migraciones](#migraciones)
6. [API Endpoints](#api-endpoints)
7. [Flujos de Autenticación](#flujos-de-autenticación)
8. [Variables de Entorno](#variables-de-entorno)
9. [Roles y Permisos](#roles-y-permisos)
10. [Cómo Ejecutar](#cómo-ejecutar)
11. [Pruebas](#pruebas)
12. [Diagrama de Flujo](#diagrama-de-flujo)
13. [Integración con otros Microservicios](#integración-con-otros-microservicios)

---

## Responsabilidades

| Función | Descripción |
|---------|-------------|
| Registro de usuarios | Hasheo bcrypt + almacenamiento seguro |
| Login | Verificación de credenciales + emisión de tokens |
| Access Token | JWT firmado, expira en 1h |
| Refresh Token | Token opaco (128 hex chars), expira en 7 días |
| Renovación de sesión | Nuevo access token sin pedir contraseña |
| Logout real | Revoca el refresh token en BD → sesión inválida |
| Logout global | Revoca TODOS los tokens del usuario |
| Gestión de usuarios | CRUD básico por roles (ADMIN/HR) |
| Recuperación de contraseña | Flujo completo forgot/reset via token de un solo uso (15 min) |
| Cambio de contraseña | Cambio autenticado verificando contraseña actual |
| Notificaciones por email | Alerta de login y cambios de empleados vía Gmail SMTP |
| Preferencias de usuario | Configuración de notificaciones por correo (login, cambios) |
| Endpoints internos | Recibe notificaciones de employee-service para reenviarlas por email |
| Middleware reutilizable | `authenticate` + `authorize` copiables a otros servicios |

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js v5 |
| Base de Datos | PostgreSQL |
| Migraciones | node-pg-migrate |
| Driver BD | pg (node-postgres) |
| Autenticación | jsonwebtoken |
| Contraseñas | bcrypt |
| Validación | Zod v4 |
| Email | nodemailer + Gmail SMTP (App Password) |
| HTTP Client | Axios (llamadas fire-and-forget) |
| Pruebas | Jest + ts-jest |
| Linting | ESLint + Prettier |
| Contenedor | Docker |

---

## Estructura de Carpetas

```
auth-service/
├── migrations/
│   ├── 001_create_users.ts                    # Tabla users con roles e índices
│   ├── 002_create_refresh_tokens.ts           # Tabla refresh_tokens con FK a users
│   ├── 1777862763125_create-password-reset-tokens.ts # Tabla password_reset_tokens
│   └── 1778200000000_add-notification-prefs.ts       # Columnas notif_login / notif_cambios
├── src/
│   ├── config/
│   │   ├── database.ts              # Pool de conexión pg
│   │   └── env.ts                   # Lectura y validación de variables de entorno
│   ├── controllers/
│   │   ├── auth.controller.ts       # register, login, refresh, logout, logout-all,
│   │   │                            #   forgotPassword, resetPassword, getPreferences,
│   │   │                            #   updatePreferences, notifyEmployeeChange
│   │   └── user.controller.ts       # findAll, findById, activate, deactivate,
│   │                                #   getProfile, changePassword
│   ├── entities/
│   │   ├── user.entity.ts                     # Interfaz User (incluye notif_login, notif_cambios)
│   │   ├── refresh-token.entity.ts            # Interfaz RefreshToken
│   │   ├── password-reset-token.entity.ts     # Interfaz PasswordResetToken
│   │   └── role.entity.ts                     # Enum RoleName + interfaz Role
│   ├── middlewares/
│   │   ├── auth.middleware.ts        # authenticate — verifica JWT
│   │   ├── authorize.middleware.ts   # authorize — valida rol
│   │   ├── error-handler.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   └── validate-request.middleware.ts
│   ├── repositories/
│   │   ├── interfaces/
│   │   │   ├── user-repository.interface.ts
│   │   │   └── password-reset-token-repository.interface.ts
│   │   ├── user.repository.ts                 # CRUD + updatePasswordHash + updateNotificationPrefs
│   │   ├── refreshToken.repository.ts         # CRUD de refresh tokens
│   │   └── password-reset-token.repository.ts # CRUD de tokens de recuperación
│   ├── routes/
│   │   ├── auth.routes.ts            # /api/v1/auth/*
│   │   ├── user.routes.ts            # /api/v1/users/*
│   │   ├── health.routes.ts          # /api/v1/health
│   │   ├── protected.routes.ts       # /api/v1/protected/* (profile, preferences, etc.)
│   │   ├── internal.routes.ts        # /api/v1/internal/* (llamadas entre servicios)
│   │   └── index.ts                  # Router raíz
│   ├── schemas/
│   │   └── auth.schema.ts            # Esquemas Zod: createUser, login, refresh, logout,
│   │                                 #   changePassword, forgotPassword, resetPassword,
│   │                                 #   notifyEmployeeChange
│   ├── services/
│   │   ├── interfaces/
│   │   │   ├── auth-service.interface.ts
│   │   │   └── email-service.interface.ts
│   │   ├── email/
│   │   │   └── smtp-email.service.ts  # SmtpEmailService + ConsoleEmailService (fallback)
│   │   ├── auth.service.ts            # Lógica completa: register, login, refresh, logout,
│   │   │                              #   forgotPassword, resetPassword, changePassword,
│   │   │                              #   getPreferences, updatePreferences, notifyEmployeeChange
│   │   └── user.service.ts            # Lógica: gestión de usuarios
│   ├── shared/
│   │   └── errors/
│   │       ├── app-error.ts
│   │       ├── conflict.error.ts     # 409
│   │       ├── forbidden.error.ts    # 403
│   │       ├── not-found.error.ts    # 404
│   │       ├── request-validation.error.ts # 400
│   │       └── unauthorized.error.ts # 401
│   ├── types/
│   ├── utils/
│   │   ├── jwt.util.ts               # generateJwtToken, verifyJwtToken
│   │   ├── password.util.ts          # hashPassword, comparePassword
│   │   └── token.util.ts             # generateRefreshToken, hashToken
│   ├── app.ts                        # Express app con middlewares
│   └── server.ts                     # Bootstrap + graceful shutdown
├── tests/
│   └── auth.service.test.ts          # Pruebas unitarias del servicio
├── .env.example
├── DOCKERFILE
├── jest.config.ts
├── package.json
├── tsconfig.json                      # Desarrollo / IDE
└── tsconfig.build.json                # Compilación de producción
```

---

## Modelo de Datos

### Tabla `users`

```sql
CREATE TABLE "users" (
  "id"            BIGSERIAL     NOT NULL,
  "first_name"    VARCHAR(100)  NOT NULL,
  "last_name"     VARCHAR(100)  NOT NULL,
  "email"         VARCHAR(150)  NOT NULL,
  "password_hash" VARCHAR(255)  NOT NULL,   -- hash bcrypt, nunca texto plano
  "role"          VARCHAR(20)   NOT NULL
                  CHECK (role IN ('ADMIN', 'HR', 'CONSULTATION')),
  "is_active"     BOOLEAN       NOT NULL DEFAULT TRUE,
  "last_login"    TIMESTAMP(6),
  "notif_login"   BOOLEAN       NOT NULL DEFAULT TRUE,  -- alerta email al iniciar sesión
  "notif_cambios" BOOLEAN       NOT NULL DEFAULT TRUE,  -- alerta email al modificar empleados
  "created_at"    TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
```

### Tabla `refresh_tokens`

```sql
CREATE TABLE "refresh_tokens" (
  "id"          BIGSERIAL     NOT NULL,
  "user_id"     BIGINT        NOT NULL,
  "token_hash"  VARCHAR(255)  NOT NULL,   -- SHA-256 del token opaco
  "expires_at"  TIMESTAMP(6)  NOT NULL,
  "revoked"     BOOLEAN       NOT NULL DEFAULT FALSE,
  "ip_origin"   VARCHAR(45),              -- IP de origen del login
  "user_agent"  TEXT,                     -- navegador/cliente
  "created_at"  TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_refresh_tokens_user"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
```

### Tabla `password_reset_tokens`

```sql
CREATE TABLE "password_reset_tokens" (
  "id"         BIGSERIAL    NOT NULL,
  "user_id"    BIGINT       NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,   -- SHA-256 del token de recuperación
  "expires_at" TIMESTAMP(6) NOT NULL,   -- expira en 15 minutos por defecto
  "used"       BOOLEAN      NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_prt_user"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
```

### Relación entre tablas

```
users (1) ─────────── (N) refresh_tokens
  id                        user_id  ← FK con CASCADE
  email                     token_hash (SHA-256, único)
  password_hash             expires_at
  role                      revoked (true al hacer logout)
  is_active
  notif_login
  notif_cambios

users (1) ─────────── (N) password_reset_tokens
  id                        user_id  ← FK con CASCADE
                            token_hash (SHA-256, uso único)
                            expires_at (15 min)
                            used (true al usar el token)
```

---

## Migraciones

Las migraciones usan `node-pg-migrate` con TypeScript, igual que el Employee Service. Se ejecutan en orden secuencial y son idempotentes.

```
migrations/
├── 001_create_users.ts                          # Crea tabla users + índices
├── 002_create_refresh_tokens.ts                 # Crea tabla refresh_tokens + FK
├── 1777862763125_create-password-reset-tokens.ts # Crea tabla password_reset_tokens
└── 1778200000000_add-notification-prefs.ts       # Agrega notif_login y notif_cambios a users
```

**Ejecutar migraciones:**
```bash
npm run migrate        # Aplica migraciones pendientes
npm run migrate:down   # Revierte la última migración
```

---

## API Endpoints

### Autenticación — `/api/v1/auth`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/auth/register` | Registra un nuevo usuario | No |
| `POST` | `/auth/login` | Login → access + refresh token | No |
| `POST` | `/auth/refresh` | Renueva access token con refresh token | No |
| `POST` | `/auth/logout` | Cierra sesión actual (revoca refresh token) | No |
| `POST` | `/auth/logout-all` | Cierra TODAS las sesiones del usuario | Bearer JWT |
| `POST` | `/auth/forgot-password` | Solicita token de recuperación por email | No |
| `POST` | `/auth/reset-password` | Restablece contraseña con token válido | No |

### Usuarios — `/api/v1/users`

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| `GET` | `/users` | Lista todos los usuarios | ADMIN |
| `GET` | `/users/:id` | Obtiene un usuario por ID | ADMIN, HR |
| `PATCH` | `/users/:id/deactivate` | Desactiva un usuario | ADMIN |
| `PATCH` | `/users/:id/activate` | Activa un usuario | ADMIN |

### Salud — `/api/v1/health`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servicio y conexión a BD |

### Rutas protegidas — `/api/v1/protected`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/protected/me` | Datos del usuario del JWT | Bearer JWT |
| `GET` | `/protected/admin-only` | Solo acceso ADMIN | Bearer JWT |
| `GET` | `/protected/hr-or-admin` | Acceso HR o ADMIN | Bearer JWT |
| `GET` | `/protected/profile` | Perfil completo del usuario autenticado | Bearer JWT |
| `POST` | `/protected/change-password` | Cambio de contraseña (requiere actual) | Bearer JWT |
| `GET` | `/protected/preferences` | Preferencias de notificación del usuario | Bearer JWT |
| `PATCH` | `/protected/preferences` | Actualiza preferencias de notificación | Bearer JWT |

### Rutas internas — `/api/v1/internal`

> Solo accesibles entre microservicios — requieren header `x-internal-key`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/internal/notify-employee-change` | Recibe evento de employee-service y envía email al usuario |

---

## Flujos de Autenticación

### Registro

```
POST /api/v1/auth/register
  Body: { firstName, lastName, email, password, role }
  ──────────────────────────────────────────────────
  1. Validar body con Zod (validateRequest middleware)
  2. Normalizar email → lowercase.trim()
  3. Verificar que el email no exista en users
  4. hashPassword(password) → bcrypt con 12 salt rounds
  5. INSERT en users
  6. Retornar 201 { id, firstName, lastName, email, role, isActive }
     (passwordHash nunca se retorna)
```

### Login

```
POST /api/v1/auth/login
  Body: { email, password }
  ─────────────────────────────────────────────────────
  1. Buscar usuario por email
  2. Verificar is_active = true
  3. comparePassword(password, passwordHash) con bcrypt
  4. Generar access_token: JWT firmado (exp: 1h)
     Payload: { sub: userId, email, role }
  5. Generar refresh_token: crypto.randomBytes(64).hex
  6. Guardar SHA-256(refresh_token) en refresh_tokens
  7. UPDATE users.last_login = NOW()
  8. Retornar 200 { accessToken, refreshToken, user }
```

### Renovación de Token (Refresh)

```
POST /api/v1/auth/refresh
  Body: { refreshToken }
  ─────────────────────────────────────────────────────
  1. Calcular SHA-256(refreshToken)
  2. Buscar en refresh_tokens por token_hash
  3. Verificar: ¿existe? ¿revoked = false? ¿expires_at > ahora?
  4. Buscar usuario por user_id → verificar is_active
  5. Generar nuevo access_token (JWT)
  6. Retornar 200 { accessToken }
  7. Si alguna verificación falla → 401 Unauthorized
```

### Logout (sesión actual)

```
POST /api/v1/auth/logout
  Body: { refreshToken }
  ─────────────────────────────────────────────────────
  1. Calcular SHA-256(refreshToken)
  2. UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1
  3. Retornar 200 { message: 'Session closed successfully' }
```

### Logout Global (todas las sesiones)

```
POST /api/v1/auth/logout-all
  Headers: Authorization: Bearer <access_token>
  ─────────────────────────────────────────────────────
  1. authenticate middleware verifica JWT → extrae userId
  2. Verificar que el usuario existe
  3. UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1
  4. Retornar 200 { message: 'All sessions closed successfully' }
```

### Recuperación de Contraseña (Forgot Password)

```
POST /api/v1/auth/forgot-password
  Body: { email }
  ─────────────────────────────────────────────────────
  1. Buscar usuario por email (si no existe, responder 200 igual — no revelar si existe)
  2. Generar token aleatorio (crypto.randomBytes)
  3. Guardar SHA-256(token) en password_reset_tokens (expires: 15 min)
  4. Enviar email con enlace: <FRONTEND_URL>/reset-password?token=<token>
  5. Retornar 200 { message: 'If the email exists, a recovery link was sent' }
```

### Restablecer Contraseña (Reset Password)

```
POST /api/v1/auth/reset-password
  Body: { token, newPassword }
  ─────────────────────────────────────────────────────
  1. Calcular SHA-256(token)
  2. Buscar en password_reset_tokens por token_hash
  3. Verificar: ¿existe? ¿used = false? ¿expires_at > ahora?
  4. Verificar que el usuario asociado esté activo
  5. hashPassword(newPassword) con bcrypt
  6. UPDATE users SET password_hash = $1 WHERE id = $2
  7. Marcar token como used = TRUE
  8. Retornar 200 { message: 'Password reset successfully' }
```

### Cambio de Contraseña (Change Password)

```
POST /api/v1/protected/change-password
  Headers: Authorization: Bearer <access_token>
  Body: { currentPassword, newPassword }
  ─────────────────────────────────────────────────────
  1. authenticate middleware verifica JWT → extrae userId
  2. Buscar usuario por userId
  3. comparePassword(currentPassword, passwordHash) con bcrypt
  4. Si no coincide → 401 Unauthorized
  5. hashPassword(newPassword) con bcrypt
  6. UPDATE users SET password_hash = $1 WHERE id = $2
  7. Retornar 200 { message: 'Password changed successfully' }
```

---

## Variables de Entorno

```env
# Aplicación
NODE_ENV=development
PORT=3001
SERVICE_NAME=auth-service

# JWT
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7

# Contraseñas
BCRYPT_SALT_ROUNDS=12

# Base de datos
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db

# Comunicación entre servicios
HISTORY_SERVICE_URL=http://localhost:3006
INTERNAL_API_KEY=clave-interna-secreta-cambiar-en-prod

# Email SMTP (Gmail con App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # App Password de 16 caracteres (no la contraseña de Gmail)
SMTP_FROM=tu-correo@gmail.com

# Recuperación de contraseña
RESET_TOKEN_EXPIRES_MINUTES=15
FRONTEND_URL=http://localhost:5173   # URL del frontend para el enlace de reset
```

> Si `SMTP_USER` o `SMTP_PASS` están vacíos, el servicio usa `ConsoleEmailService` (imprime los correos en consola) — útil para desarrollo sin SMTP configurado.

---

## Roles y Permisos

| Rol | Valor en BD | Acceso |
|-----|-------------|--------|
| Administrador | `ADMIN` | CRUD completo, gestión de usuarios |
| RRHH | `HR` | Consulta de usuarios, operaciones de empleados |
| Consulta | `CONSULTATION` | Solo lectura en otros servicios |

El rol se guarda directamente en la columna `role` de la tabla `users`. No existe una tabla separada de roles.

---

## Cómo Ejecutar

### Desarrollo local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# Ejecutar migraciones
npm run migrate

# Iniciar en modo desarrollo (hot reload)
npm run dev
```

### Docker

```bash
docker build -t auth-service .
docker run -p 3001:3001 --env-file .env auth-service
```

---

## Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Modo watch
npm run test:watch

# Con cobertura
npm run test:coverage
```

### Cobertura objetivo: 60% mínimo (SonarCloud)

Las pruebas cubren:
- `register`: registro exitoso, email duplicado, normalización de email
- `login`: login exitoso, usuario inexistente, usuario inactivo, contraseña incorrecta
- `refresh`: token válido, token revocado, token expirado, token inexistente
- `logout`: revocación de token
- `logoutAll`: revocación global, usuario inexistente

---

## Diagrama de Flujo

### Ciclo completo de autenticación

```
Cliente                         Auth Service                   Base de Datos
  │                                  │                               │
  │─── POST /auth/register ─────────►│                               │
  │    { firstName, lastName,         │── INSERT users ──────────────►│
  │      email, password, role }      │◄─ { id, email, role } ───────│
  │◄── 201 { user } ────────────────│                               │
  │                                  │                               │
  │─── POST /auth/login ────────────►│                               │
  │    { email, password }            │── SELECT users WHERE email ──►│
  │                                  │◄─ user row ───────────────────│
  │                                  │── bcrypt.compare ─────────────│ (local)
  │                                  │── INSERT refresh_tokens ──────►│
  │◄── 200 { accessToken,           │                               │
  │          refreshToken, user } ───│                               │
  │                                  │                               │
  │  (1 hora después, access expira) │                               │
  │                                  │                               │
  │─── POST /auth/refresh ──────────►│                               │
  │    { refreshToken }               │── SELECT refresh_tokens ──────►│
  │                                  │◄─ token record ───────────────│
  │                                  │── verificar: !revoked, !exp   │ (local)
  │◄── 200 { accessToken } ─────────│                               │
  │                                  │                               │
  │─── POST /auth/logout ───────────►│                               │
  │    { refreshToken }               │── UPDATE refresh_tokens       │
  │                                  │   SET revoked = TRUE ─────────►│
  │◄── 200 { message } ─────────────│                               │
```

### Validación de JWT en otros microservicios

```
Cliente                       Employee/Contract/etc             Auth Service
  │                                  │                               │
  │─── GET /api/empleados ──────────►│                               │
  │    Authorization: Bearer JWT      │                               │
  │                                  │── verifyJwtToken(token) ──────│ (local, sin HTTP)
  │                                  │   usando JWT_SECRET compartido│
  │                                  │── req.user = { sub, email,    │
  │                                  │               role }          │
  │◄── 200 { empleados } ───────────│                               │
```

> **Nota:** Cada microservicio valida el JWT localmente usando el mismo `JWT_SECRET`. No hay llamada HTTP al Auth Service por cada request — esto es stateless y eficiente.

---

## Integración con otros Microservicios

### Lo que provee Auth Service

- `JWT_SECRET`: compartido con todos los servicios via variable de entorno
- `authenticate` middleware: copiado/adaptado en cada servicio para validar tokens
- `authorize` middleware: copiado/adaptado para validar roles

### ← employee-service (Puerto 3002) — notificaciones de cambios

employee-service llama al endpoint interno `POST /internal/notify-employee-change` tras cada operación de empleado. auth-service recibe la solicitud y, si el usuario tiene `notif_cambios = true`, envía un email de confirmación.

```
employee-service ──POST /internal/notify-employee-change──► auth-service
  Header: x-internal-key: <INTERNAL_API_KEY>
  Body: { userEmail, action, employeeName }
  (fire-and-forget desde employee-service)
```

### → history-service (Puerto 3006) — registro de acciones (futuro)

```
Auth Service → POST /api/historial/acciones
  {
    "accion": "login",
    "usuario_email": "user@empresa.com",
    "resultado": "exitoso",
    "ip_origen": "192.168.1.1"
  }
```

Esta integración puede activarse en el futuro. Si History Service no está disponible, el login igual se completa (fire-and-forget).
