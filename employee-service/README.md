# Employee Service

Employee management microservice for the Employees Administration System.

## Overview

This service is responsible for the full lifecycle of employee records within the platform.  
It validates every incoming request against the **auth-service** via HTTP REST before processing,
applies strict role-based access control, stores uploaded files in **AWS S3**, and notifies
the **history-service** of every modification (fire-and-forget).

> **Contract data** (contract type, payment method, salary terms) is handled exclusively by the
> **contract-service** (:3003).  
> **Change history / audit trail** is handled exclusively by the **history-service** (:3006).

## Main Responsibilities

- Register employees with personal, contact, and location information (RRHH role)
- Query employees individually or in bulk
- Control which fields each role can modify
- Track salary and position history via the `cargos_salarios` table
- Store and manage employee documents (photo, CV, certificates, etc.) in AWS S3 via `documentos_empleado`
- Manage employee status (activo, inactivo, vacaciones, licencia, retirado)
- Health check endpoint

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js v5
- **ORM**: Prisma (PostgreSQL)
- **Validation**: Zod
- **File uploads**: Multer + AWS S3
- **HTTP client**: Axios (calls auth-service / history-service)
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier

## Project Structure

```
src/
  config/         # env, prisma singleton, database helpers, multer + S3 setup
  controllers/    # thin HTTP layer — delegates to services
  dtos/           # TypeScript interfaces for request payloads
  entities/       # Domain interfaces and enums
  middlewares/    # auth (HTTP→auth-service), authorize, validate, error-handler
  repositories/   # Prisma data access layer
  routes/         # Express routers with role guards
  schemas/        # Zod validation schemas
  services/       # Business logic, S3 file management, history notification
  shared/         # Reusable errors and enums
  types/          # Shared TypeScript types
  utils/          # auth-client, file helpers, s3-client
  app.ts          # Express app setup
  server.ts       # Bootstrap + graceful shutdown

prisma/
  schema.prisma           # Data model (Empleado + CargoSalario + DocumentoEmpleado)
  migrations/0_init/      # Initial SQL migration

tests/
  employee.service.test.ts            # Unit tests — EmployeeService
  employee.routes.integration.test.ts # Integration tests — HTTP endpoints
```

## Database Schema

### ENUMs

| Enum | Values |
|---|---|
| `tipo_documento_enum` | `cedula_ciudadania`, `cedula_extranjeria`, `pasaporte`, `tarjeta_identidad` |
| `genero_enum` | `masculino`, `femenino`, `otro`, `prefiero_no_decir` |
| `estado_empleado_enum` | `activo`, `inactivo`, `vacaciones`, `licencia`, `retirado` |
| `nivel_educativo_enum` | `bachiller`, `tecnico`, `tecnologo`, `universitario`, `posgrado` |
| `tipo_salario_enum` | `fijo`, `variable`, `por_hora` |
| `tipo_documento_s3_enum` | `foto`, `hoja_vida`, `certificado`, `diploma`, `contrato_firmado`, `otro` |

---

### `empleados`

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | Auto-increment |
| cedula | VARCHAR(20) UNIQUE | National ID — only Admin can modify |
| tipo_documento | tipo_documento_enum | Default: `cedula_ciudadania` |
| nombre | VARCHAR(100) | Only Admin can modify |
| apellido | VARCHAR(100) | Only Admin can modify |
| genero | genero_enum nullable | — |
| fecha_nacimiento | DATE nullable | — |
| celular | VARCHAR(20) nullable | Employee can self-edit |
| telefono_fijo | VARCHAR(20) nullable | Employee can self-edit |
| correo_personal | VARCHAR(150) nullable | Employee can self-edit |
| correo_corporativo | VARCHAR(150) UNIQUE | Corporate email — HR/Admin assigns |
| direccion | TEXT nullable | — |
| ciudad | VARCHAR(100) nullable | — |
| departamento | VARCHAR(100) nullable | — |
| nivel_educativo | nivel_educativo_enum nullable | — |
| estado | estado_empleado_enum | Default: `activo` |
| fecha_ingreso | DATE nullable | — |
| fecha_retiro | DATE nullable | NULL while employee is active |
| created_at | TIMESTAMP(6) | Auto |
| updated_at | TIMESTAMP(6) | Auto-updated |

> **Removed from original schema:** `password_hash`, `auth_user_id` (authentication is Auth Service's responsibility), `photo_path`, `cv_path` (replaced by `documentos_empleado`), `position`, `salary`, `contract_type`, `contract_start`, `contract_end`, `payment_method`, `payment_frequency` (contract data belongs to Contract Service :3003).

---

### `cargos_salarios`

Immutable history of position and salary changes. Only one record per employee can have `activo = TRUE` at a time.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | — |
| empleado_id | BIGINT FK | RESTRICT on employee delete |
| cargo | VARCHAR(100) | Job title |
| departamento | VARCHAR(100) nullable | — |
| salario | DECIMAL(12,2) | — |
| tipo_salario | tipo_salario_enum | Default: `fijo` |
| fecha_inicio | DATE | When this position/salary took effect |
| fecha_fin | DATE nullable | NULL = currently active |
| activo | BOOLEAN | Default: TRUE |
| motivo_cambio | TEXT nullable | e.g. "Promoción a Senior" |
| registrado_por | VARCHAR(150) nullable | Email of HR who registered the change |
| created_at | TIMESTAMP(6) | — |

---

### `documentos_empleado`

Files stored in AWS S3. Replaces `photo_path` and `cv_path`. When a new version of the same type is uploaded, the previous record is marked `activo = FALSE`.

| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | — |
| empleado_id | BIGINT FK | CASCADE on employee delete |
| tipo | tipo_documento_s3_enum | foto, hoja_vida, certificado, etc. |
| nombre_archivo | VARCHAR(255) nullable | Original filename |
| s3_key | TEXT | Object key in S3 |
| s3_url | TEXT | Base URL (unsigned) |
| mime_type | VARCHAR(100) nullable | e.g. `image/jpeg`, `application/pdf` |
| tamano_bytes | BIGINT nullable | — |
| activo | BOOLEAN | Default: TRUE |
| subido_por | VARCHAR(150) nullable | Email of HR who uploaded the file |
| created_at | TIMESTAMP(6) | — |

## API Endpoints

Base URL: `http://localhost:3002/api/v1`

### Employees

| Method | Route | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/health` | ❌ | — | Service health + DB status |
| GET | `/employees` | ✅ | ALL | List all employees |
| GET | `/employees/:id` | ✅ | ALL | Get employee by id |
| GET | `/employees/cedula/:cedula` | ✅ | ALL | Get employee by cedula |
| POST | `/employees` | ✅ | HR, ADMIN | Register employee |
| PATCH | `/employees/:id/contact` | ✅ | ALL* | Update celular / correo_personal |
| PATCH | `/employees/:id/identity` | ✅ | ADMIN | Update nombre / apellido / cedula / tipo_documento |
| PATCH | `/employees/:id/status` | ✅ | ADMIN | Change employee estado |
| DELETE | `/employees/:id` | ✅ | ADMIN | Hard delete |

### Cargos y Salarios

| Method | Route | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/employees/:id/cargos` | ✅ | HR, ADMIN | Full salary/position history |
| POST | `/employees/:id/cargos` | ✅ | HR, ADMIN | Assign new cargo/salary |

### Documentos

| Method | Route | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/employees/:id/documentos` | ✅ | HR, ADMIN | List employee documents |
| POST | `/employees/:id/documentos` | ✅ | HR, ADMIN, SELF* | Upload document to S3 |
| DELETE | `/employees/:id/documentos/:docId` | ✅ | ADMIN | Delete document |

> \* Service-level validation ensures employees can only modify their own records.

### Response format

```json
// Success
{ "success": true, "message": "...", "data": { ... } }

// Error
{ "success": false, "message": "...", "error": { "code": "...", "details": null } }
```

## Role Matrix

| Action | ADMIN | HR | CONSULTATION | Employee (self) |
|---|:---:|:---:|:---:|:---:|
| List / view employees | ✅ | ✅ | ✅ | ✅ |
| Register employee | ✅ | ✅ | ❌ | ❌ |
| Edit identity (nombre, cedula) | ✅ | ❌ | ❌ | ❌ |
| Edit contact (celular, correo_personal) | ✅ | ✅ | ❌ | ✅ |
| Upload documents (S3) | ✅ | ✅ | ❌ | ✅ |
| Assign cargo / salary | ✅ | ✅ | ❌ | ❌ |
| Change estado | ✅ | ❌ | ❌ | ❌ |
| Delete employee | ✅ | ❌ | ❌ | ❌ |

## JWT Validation

Every protected endpoint calls **auth-service** at:

```
GET {AUTH_SERVICE_URL}/api/v1/protected/me
Authorization: Bearer <token>
```

If auth-service returns 200, the user payload (`sub`, `email`, `role`) is attached to `req.user` and the request proceeds. Any non-200 response results in a `401 Unauthorized`.

## Environment Variables

```env
NODE_ENV=development
PORT=3002
SERVICE_NAME=employee-service
JWT_SECRET=supersecretkey
AUTH_SERVICE_URL=http://localhost:3001
HISTORY_SERVICE_URL=http://localhost:3006
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/employee_db"
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run migrations
npm run prisma:migrate

# 5. Start in development mode
npm run dev
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```
