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
| Pruebas | Jest + ts-jest |
| Linting | ESLint + Prettier |
| Contenedor | Docker |

---

## Estructura de Carpetas

```
auth-service/
├── migrations/
│   ├── 001_create_users.ts          # Tabla users con roles e índices
│   └── 002_create_refresh_tokens.ts # Tabla refresh_tokens con FK a users
├── src/
│   ├── config/
│   │   ├── database.ts              # Pool de conexión pg
│   │   └── env.ts                   # Lectura y validación de variables de entorno
│   ├── controllers/
│   │   ├── auth.controller.ts       # register, login, refresh, logout, logout-all
│   │   └── user.controller.ts       # findAll, findById, activate, deactivate
│   ├── dtos/
│   │   ├── create-user.dto.ts       # DTO para registro
│   │   └── login.dto.ts             # DTO para login
│   ├── entities/
│   │   ├── user.entity.ts           # Interfaz User
│   │   ├── refresh-token.entity.ts  # Interfaz RefreshToken
│   │   └── role.entity.ts           # Enum RoleName + interfaz Role
│   ├── middlewares/
│   │   ├── auth.middleware.ts        # authenticate — verifica JWT
│   │   ├── authorize.middleware.ts   # authorize — valida rol
│   │   ├── error-handler.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   └── validate-request.middleware.ts
│   ├── repositories/
│   │   ├── user.repository.ts        # CRUD de usuarios (raw pg)
│   │   └── refreshToken.repository.ts # CRUD de refresh tokens
│   ├── routes/
│   │   ├── auth.routes.ts            # /api/v1/auth/*
│   │   ├── user.routes.ts            # /api/v1/users/*
│   │   ├── health.routes.ts          # /api/v1/health
│   │   ├── protected.routes.ts       # /api/v1/protected/* (ejemplos)
│   │   └── index.ts                  # Router raíz
│   ├── schemas/
│   │   └── auth.schema.ts            # Esquemas Zod para validación
│   ├── services/
│   │   ├── auth.service.ts           # Lógica: register, login, refresh, logout
│   │   └── user.service.ts           # Lógica: gestión de usuarios
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
└── tsconfig.json
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

### Relación entre tablas

```
users (1) ─────────── (N) refresh_tokens
  id                        user_id  ← FK con CASCADE
  email                     token_hash (SHA-256, único)
  password_hash             expires_at
  role                      revoked (true al hacer logout)
  is_active
```

---

## Migraciones

Las migraciones usan `node-pg-migrate` con TypeScript, igual que el Employee Service. Se ejecutan en orden secuencial y son idempotentes.

```
migrations/
├── 001_create_users.ts          # Crea tabla users + índices
└── 002_create_refresh_tokens.ts # Crea tabla refresh_tokens + FK
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

### Rutas protegidas de ejemplo — `/api/v1/protected`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/protected/me` | Datos del usuario autenticado |
| `GET` | `/protected/admin-only` | Solo acceso ADMIN |
| `GET` | `/protected/hr-or-admin` | Acceso HR o ADMIN |

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
```

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

### Comunicación con History Service (futuro)

```
Auth Service → POST /api/historial/acciones
  {
    "accion": "login",
    "usuario_email": "user@empresa.com",
    "resultado": "exitoso",
    "ip_origen": "192.168.1.1"
  }
```

Esta integración es fire-and-forget: si History Service no está disponible, el login igual se completa.
