# Contract Service

> Microservicio 3 de 7 · Puerto **3003** · Base de datos: `contract_db`

Dueño de los contratos laborales, adendas, historial contractual por empleado y referencias privadas a documentos en AWS S3. Garantiza que solo exista un contrato activo por empleado y aplica vencimiento automático vía job diario.

---

## Tabla de Contenido

1. [Responsabilidades](#1-responsabilidades)
2. [Tech Stack](#2-tech-stack)
3. [Estructura de Carpetas](#3-estructura-de-carpetas)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Migraciones](#5-migraciones)
6. [API Endpoints](#6-api-endpoints)
7. [Flujos Principales](#7-flujos-principales)
8. [Flujo de Archivos en S3](#8-flujo-de-archivos-en-s3)
9. [Vencimiento Automático](#9-vencimiento-automático)
10. [Distribución de Pagos](#10-distribución-de-pagos)
11. [Variables de Entorno](#11-variables-de-entorno)
12. [Roles y Permisos](#12-roles-y-permisos)
13. [Seguridad S3](#13-seguridad-s3)
14. [Integración con otros Microservicios](#14-integración-con-otros-microservicios)
15. [Cómo Ejecutar](#15-cómo-ejecutar)
16. [Pruebas](#16-pruebas)

---

## 1. Responsabilidades

| Función | Descripción |
|---------|-------------|
| Crear contratos | Asociados lógicamente a `employee-service.empleados.id` vía validación REST |
| Un contrato activo | Garantiza que solo exista un contrato `activo` por empleado |
| Renovar contratos | Cierra el contrato anterior en una transacción y crea uno nuevo |
| Actualizar estado | Cambia el estado del contrato (activo/vencido/terminado/suspendido) |
| Adendas | Registra modificaciones sobre contratos activos con `cambios_json` (antes/después) |
| Historial contractual | Mantiene el historial completo de contratos por empleado |
| Distribución de pagos | Calcula el monto por pago según periodicidad (mensual/quincenal/semanal) |
| Almacenamiento S3 | Genera presigned URLs de subida y descarga para PDFs de contratos y adendas |
| Validación S3 | HeadObject verifica que el archivo exista en S3 antes de crear cualquier contrato |
| Auditoría | Registra cambios en history-service (fire-and-forget) vía `ContractAuditService` |
| Vencimiento automático | Job diario que marca como vencido todo contrato con fecha_fin pasada |

---

## 2. Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18 + TypeScript 5 |
| Framework | Express.js v5 |
| Base de datos | PostgreSQL 14+ con `pg` (sin ORM) |
| Migraciones | node-pg-migrate (TypeScript) — nombres con timestamp |
| Almacenamiento | AWS S3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) |
| Auth | JWT — verificación local con `jsonwebtoken` |
| HTTP Client | axios |
| Validación | Zod |
| Pruebas | Jest + ts-jest |
| Contenedor | Docker |

---

## 3. Estructura de Carpetas

```
contract-service/
├── migrations/
│   ├── 20260503120000000_create_contract.ts
│   ├── 20260503120100000_create_contract_amendments.ts
│   └── 20260505152000000_align_contract_integrations.ts
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── s3.ts                              # Cliente S3 + presigned URL helpers
│   ├── clients/
│   │   ├── employeeServiceClient.ts           # GET /empleados/:id (valida empleado)
│   │   └── historyServiceClient.ts            # registrarCambio + registrarAccion (fire-and-forget)
│   ├── controller/                            # ← directorio singular (no "controllers")
│   │   └── contract.controller.ts
│   ├── dtos/
│   │   ├── create-contract.dto.ts
│   │   ├── create-contract-amendment.dto.ts   # ← nombre real (no "create-amendment.dto.ts")
│   │   ├── update-contract-status.dto.ts      # ← actualizar estado del contrato
│   │   └── contract-file.dto.ts               # ← presigned URL / archivo S3
│   ├── entities/
│   │   └── contract.entity.ts                 # Tipos TypeScript (placeholder)
│   ├── jobs/
│   │   └── expire-ended-contracts.job.ts      # ← nombre real (no "autoExpire.job.ts")
│   ├── middlewares/
│   │   ├── auth.middleware.ts                 # authenticateToken + authorizeRoles()
│   │   ├── validation.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── repositories/
│   │   ├── interfaces/
│   │   ├── contract.repository.ts
│   │   └── contract-amendment.repository.ts
│   ├── routes/
│   │   └── contract.routes.ts
│   ├── services/
│   │   ├── interfaces/
│   │   ├── contract.service.ts                # Orquestación principal
│   │   ├── contract-audit.service.ts          # Toda la lógica de auditoría con History Service
│   │   ├── contract-storage.service.ts        # Abstracción de operaciones S3
│   │   └── payment-distribution.service.ts    # Cálculo de monto por pago según periodicidad
│   ├── shared/
│   │   ├── enums/
│   │   │   ├── contract-status.enum.ts
│   │   │   ├── contract-type.enum.ts
│   │   │   ├── payment-frequency.enum.ts
│   │   │   ├── payment-method.enum.ts
│   │   │   ├── work-mode.enum.ts
│   │   │   └── work-schedule.enum.ts
│   │   └── errors/
│   │       ├── app-error.ts
│   │       ├── conflict.error.ts
│   │       ├── not-found.error.ts
│   │       └── validation.error.ts
│   ├── types/
│   │   └── contract-actor.type.ts             # { email, role } del usuario autenticado
│   ├── utils/
│   │   └── date.util.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── Dockerfile
├── jest.config.ts
├── tsconfig.json
├── tsconfig.build.json
├── tsconfig.test.json
└── tsconfig.migrations.json
```

> **Nota:** `authorizeRoles()` está definida dentro de `auth.middleware.ts`, no en un archivo separado.

---

## 4. Modelo de Datos

### Tabla `contratos`

```sql
CREATE TABLE contratos (
  id                BIGSERIAL PRIMARY KEY,
  empleado_id       BIGINT NOT NULL,                         -- lógico, validado en employee-service
  tipo              VARCHAR(50) NOT NULL CHECK (tipo IN
                      ('indefinido','fijo','obra_labor','aprendizaje','prestacion_servicios')),
  salario           DECIMAL(12,2) NOT NULL CHECK (salario <= 100000000),
  moneda            VARCHAR(10) DEFAULT 'COP',
  fecha_inicio      DATE NOT NULL,
  fecha_fin         DATE,
  metodo_pago       VARCHAR(50) CHECK (metodo_pago IN ('transferencia','cheque','efectivo')),
  periodicidad_pago VARCHAR(50) CHECK (periodicidad_pago IN ('mensual','quincenal','semanal')),
  lugar_trabajo     VARCHAR(150),
  modalidad         VARCHAR(50) DEFAULT 'presencial'
                    CHECK (modalidad IN ('presencial','remoto','hibrido')),
  jornada           VARCHAR(50) DEFAULT 'completa'
                    CHECK (jornada IN ('completa','medio_tiempo','flexible')),
  archivo_s3_key    TEXT,                                    -- solo la clave, nunca URLs públicas
  estado            VARCHAR(20) DEFAULT 'activo'
                    CHECK (estado IN ('activo','vencido','terminado','suspendido')),
  creado_por        VARCHAR(150),
  created_at        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contratos_empleado_estado ON contratos(empleado_id, estado);
```

### Tabla `adendas_contratos`

```sql
CREATE TABLE adendas_contratos (
  id              BIGSERIAL PRIMARY KEY,
  contrato_id     BIGINT NOT NULL REFERENCES contratos(id) ON DELETE RESTRICT,
  numero_adenda   INT NOT NULL,
  descripcion     TEXT NOT NULL,
  cambios_json    JSONB,              -- { campo: { before: valor, after: valor } }
  fecha_vigencia  DATE NOT NULL,
  archivo_s3_key  TEXT,
  creado_por      VARCHAR(150),
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (contrato_id, numero_adenda)
);

CREATE INDEX idx_adendas_contrato_id ON adendas_contratos(contrato_id);
```

### Ejemplo de `cambios_json`

```json
{
  "salario":   { "before": 5500000, "after": 5800000 },
  "modalidad": { "before": "hibrido", "after": "remoto" },
  "fecha_fin": { "before": "2026-12-31", "after": "2027-12-31" }
}
```

---

## 5. Migraciones

```bash
npm run migrate        # Aplica migraciones pendientes
npm run migrate:down   # Revierte la última migración
```

Las migraciones usan nombres con timestamp (formato `YYYYMMDDHHmmssSSS_nombre.ts`). Son idempotentes. En Docker corren automáticamente al iniciar el contenedor.

> **Nota:** no se renombraron migraciones de otros servicios que usan `001_*`, `002_*`. Si ya fueron aplicadas, cambiarlas puede desalinear la tabla `pgmigrations`. La limpieza requiere backup previo y revisión por ambiente.

---

## 6. API Endpoints

Todos los endpoints requieren `Authorization: Bearer <access_token>` salvo `/health`.

Base path: `/api/contratos`

> Los endpoints con doble nombre admiten tanto inglés como español (ej. `/employee/` y `/empleado/`). Ambas rutas funcionan de manera equivalente.

### Consulta

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/` | Listar contratos con filtros | ADMIN, HR, CONSULTATION |
| GET | `/:id` | Detalle de contrato | ADMIN, HR, CONSULTATION |
| GET | `/me/latest` | Último contrato propio (solo Consultante) | CONSULTATION |
| GET | `/employee/:employeeId` · `/empleado/:employeeId` | Contratos de un empleado | ADMIN, HR, CONSULTATION |
| GET | `/employee/:employeeId/active` · `/empleado/:employeeId/activo` | Contrato activo de un empleado | ADMIN, HR, CONSULTATION |

### Gestión

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/` | Crear contrato | ADMIN, HR |
| POST | `/renewals` · `/renovaciones` | Renovar contrato (transaccional) | ADMIN, HR |
| PATCH | `/:id/status` · `/:id/estado` | Actualizar estado del contrato | ADMIN, HR |

### Archivos S3

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/presigned-url` | URL de subida para PDF de contrato (5 min) | ADMIN, HR |
| GET | `/:id/document/url` · `/:id/documento/url` | URL de descarga del contrato (1 hora) | ADMIN, HR, CONSULTATION |

### Adendas

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/:id/amendments` · `/:id/adendas` | Agregar adenda con cambios_json | ADMIN, HR |
| GET | `/:id/amendments` · `/:id/adendas` | Listar adendas del contrato | ADMIN, HR, CONSULTATION |
| POST | `/:id/amendments/presigned-url` · `/:id/adendas/presigned-url` | URL de subida para PDF de adenda (5 min) | ADMIN, HR |
| GET | `/:id/amendments/:amendmentId/document/url` · `/:id/adendas/:amendmentId/documento/url` | URL de descarga de adenda (1 hora) | ADMIN, HR, CONSULTATION |

### Salud

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Estado del servicio y BD |

---

### Ejemplos de request / response

**POST `/api/contratos`**
```json
// Request — acepta nombres en inglés (camelCase) o español (snake_case)
{
  "empleadoId": 7,
  "tipo": "fijo",
  "salario": 5500000,
  "moneda": "COP",
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-12-31",
  "metodoPago": "transferencia",
  "periodicidadPago": "mensual",
  "lugarTrabajo": "Bogotá",
  "modalidad": "hibrido",
  "jornada": "completa",
  "archivoS3Key": "contratos/empleados/7/contratos/contrato-2026.pdf"
}

// Response 201
{
  "success": true,
  "data": {
    "id": 5,
    "empleadoId": 7,
    "tipo": "fijo",
    "estado": "activo",
    "distribucionPago": {
      "baseMonthlySalary": 5500000,
      "paymentFrequency": "mensual",
      "paymentsPerMonth": 1,
      "amountPerPayment": 5500000
    }
  }
}

// Response 409 — ya tiene contrato activo
{ "error": "El empleado ya tiene un contrato activo", "code": "CONFLICT" }
```

**POST `/api/contratos/renewals`**
```json
// Request
{
  "empleadoId": 7,
  "tipo": "fijo",
  "salario": 5800000,
  "fechaInicio": "2027-01-01",
  "fechaFin": "2027-12-31",
  "archivoS3Key": "contratos/empleados/7/contratos/renovacion-2027.pdf"
}
// previousEndDate se resuelve automáticamente como 1 día antes de fechaInicio si no se envía

// Response 201 — transacción: contrato anterior → vencido, nuevo → activo
{ "success": true, "data": { "id": 6, "tipo": "fijo", "estado": "activo" } }
```

**PATCH `/api/contratos/:id/status`**
```json
// Request — acepta "status" o "estado"
{ "status": "terminado" }

// Response 200
{ "success": true, "data": { "id": 5, "estado": "terminado" } }
```

**POST `/api/contratos/:id/amendments`**
```json
// Request
{
  "descripcion": "Ajuste salarial y cambio de modalidad",
  "fechaVigencia": "2026-06-01",
  "cambiosJson": {
    "salario":   { "before": 5500000, "after": 5800000 },
    "modalidad": { "before": "hibrido", "after": "remoto" }
  },
  "archivoS3Key": "contratos/empleados/7/contratos/adendas/adenda-1.pdf"
}

// Response 201
{ "success": true, "data": { "id": 1, "numeroAdenda": 1, "contratoId": 5 } }
```

---

## 7. Flujos Principales

### Consultar último contrato propio (CONSULTATION)

```
GET /api/contratos/me/latest
  1. Verificar JWT (solo role: CONSULTATION)
  2. Extraer employeeId del JWT (debe estar presente)
  3. Buscar contrato activo para ese empleado
  4. Si no existe → 404 "Active contract not found for authenticated user"
  5. Retornar 200 con contrato + distribucionPago + documento URL (si s3_key existe)
```

### Crear contrato

```
POST /api/contratos
  1. Verificar JWT (roles: ADMIN, HR)
  2. Validar body con Zod
  3. Validar empleado:
     GET http://employee-service:3002/api/empleados/:empleadoId
     → 404 → "El empleado no existe en el sistema"
     → 503 → "Employee Service no disponible"
  4. Verificar que no existe contrato activo para ese empleado → 409 si existe
  5. Si archivoS3Key informado:
     → HeadObject en S3 para validar existencia
     → Error si el archivo no existe
  6. INSERT en contratos (solo guarda s3_key, nunca URLs públicas)
  7. ContractAuditService.recordContractCreated() → History Service (fire-and-forget)
  8. Calcular distribucionPago con calculatePaymentDistribution()
  9. Retornar 201 con datos del contrato + distribucionPago
```

### Renovar contrato (transaccional)

```
POST /api/contratos/renewals
  1. Verificar JWT (roles: ADMIN, HR)
  2. Validar empleado en Employee Service
  3. Buscar contrato activo del empleado con SELECT ... FOR UPDATE (bloqueo)
  4. Si archivoS3Key → HeadObject en S3
  5. Resolver previousEndDate: si no viene en el body, se usa fechaInicio - 1 día
  6. BEGIN TRANSACTION:
     a. UPDATE contrato anterior → estado del body (por defecto 'vencido'), fecha_fin = previousEndDate
     b. INSERT nuevo contrato → estado = 'activo'
  7. COMMIT
  8. ContractAuditService.recordContractRenewed() → History Service (fire-and-forget)
  9. Retornar 201
```

### Actualizar estado del contrato

```
PATCH /api/contratos/:id/status
  Body: { status: 'activo' | 'vencido' | 'terminado' | 'suspendido' }
        (también acepta "estado" como nombre del campo)
  1. Verificar JWT (roles: ADMIN, HR)
  2. Validar body con Zod (updateContractStatusSchema)
  3. Buscar contrato → 404 si no existe
  4. UPDATE contratos SET estado = $status
  5. ContractAuditService.recordStatusUpdated() → History Service (fire-and-forget)
  6. Retornar 200 con contrato actualizado
```

### Agregar adenda

```
POST /api/contratos/:id/amendments
  1. Verificar JWT (roles: ADMIN, HR)
  2. Verificar que el contrato existe y está activo → 400 si no
  3. Si archivoS3Key → HeadObject en S3
  4. Calcular numero_adenda = COUNT(adendas existentes) + 1
  5. INSERT en adendas_contratos con cambios_json
  6. Si cambios_json contiene campos soportados:
     UPDATE contratos con los nuevos valores
     (campos: salario, moneda, fecha_fin, metodo_pago, periodicidad_pago,
              lugar_trabajo, modalidad, jornada)
  7. ContractAuditService.recordContractAmendmentCreated() → History Service (fire-and-forget)
  8. Retornar 201
```

---

## 8. Flujo de Archivos en S3

```
Paso 1 — Solicitar URL de subida
POST /api/contratos/presigned-url
Body: { "empleadoId": 7, "contentType": "application/pdf", "nombreArchivo": "contrato-2026.pdf" }
← { url: "https://s3.amazonaws.com/...", key: "contratos/empleados/7/contratos/...", expiresIn: 300 }

Paso 2 — PUT directo del frontend a S3 (NO pasa por el backend)
PUT <url del paso 1>
Headers: Content-Type: application/pdf
Body: <bytes del PDF>
← 200 OK de AWS S3

Paso 3 — Crear contrato enviando la clave S3
POST /api/contratos
Body: { ..., "archivoS3Key": "contratos/empleados/7/contratos/..." }
→ HeadObject verifica que el archivo exista en S3 antes de guardar en BD
→ Solo se guarda la clave s3_key, nunca URLs públicas permanentes

Paso 4 — Descargar cuando se necesite
GET /api/contratos/:id/document/url
← { url: "https://s3.amazonaws.com/...", expiresIn: 3600 }
  → URL temporal válida 1 hora
```

---

## 9. Vencimiento Automático

Al arrancar el servicio se registra un **job diario** (`expire-ended-contracts.job.ts`) que ejecuta:

```sql
UPDATE contratos
SET estado = 'vencido', updated_at = NOW()
WHERE estado = 'activo'
  AND fecha_fin IS NOT NULL
  AND fecha_fin < CURRENT_DATE;
```

Cada contrato vencido automáticamente se registra en History Service via `ContractAuditService.recordContractAutoExpired()`:

```
campo_modificado: 'estado'
valor_anterior:   'activo'
valor_nuevo:      'vencido'
usuario_modificador: 'contract-service'
rol_modificador: 'system'
accion: 'contrato_vencido_automaticamente'
```

---

## 10. Distribución de Pagos

El servicio `payment-distribution.service.ts` calcula automáticamente cuánto recibe el empleado por cada pago según la periodicidad del contrato. Este cálculo se incluye en las respuestas de creación, renovación y adendas, y también se registra en el History Service.

```typescript
calculatePaymentDistribution(baseMonthlySalary, paymentFrequency?)
// Retorna: { baseMonthlySalary, paymentFrequency, paymentsPerMonth, amountPerPayment }
```

| Periodicidad | Pagos por mes | Monto por pago |
|-------------|:-------------:|----------------|
| `mensual` | 1 | salario / 1 |
| `quincenal` | 2 | salario / 2 |
| `semanal` | 4 | salario / 4 |

Si no se especifica periodicidad, se asume `mensual`. El monto se redondea a 2 decimales con corrección de punto flotante.

**Ejemplo:**
```json
{
  "baseMonthlySalary": 5800000,
  "paymentFrequency": "quincenal",
  "paymentsPerMonth": 2,
  "amountPerPayment": 2900000
}
```

---

## 11. Variables de Entorno

```env
# Aplicación
NODE_ENV=development
PORT=3003
SERVICE_NAME=contract-service

# Base de datos
DATABASE_URL=postgresql://postgres:password@localhost:5432/contract_db

# JWT (mismo secreto compartido con auth-service)
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234

# Comunicación entre servicios
EMPLOYEE_SERVICE_URL=http://localhost:3002
HISTORY_SERVICE_URL=http://localhost:3006
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion
CORS_ORIGINS=http://localhost:5173
REQUEST_TIMEOUT_MS=5000

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=admin-employee-microservice
```

---

## 12. Roles y Permisos

| Acción | ADMIN | HR | CONSULTATION |
|--------|:-----:|:--:|:------------:|
| Listar contratos | ✅ | ✅ | ✅ |
| Ver contrato por ID | ✅ | ✅ | ✅ |
| Ver contratos de un empleado | ✅ | ✅ | ✅ |
| Ver contrato activo de un empleado | ✅ | ✅ | ✅ |
| Ver último contrato propio (`/me/latest`) | ❌ | ❌ | ✅ |
| Crear contrato | ✅ | ✅ | ❌ |
| Renovar contrato | ✅ | ✅ | ❌ |
| Actualizar estado del contrato | ✅ | ✅ | ❌ |
| Crear adenda | ✅ | ✅ | ❌ |
| Ver adendas | ✅ | ✅ | ✅ |
| Generar URL subida S3 | ✅ | ✅ | ❌ |
| Descargar contrato/adenda | ✅ | ✅ | ✅ |

---

## 13. Seguridad S3

- El bucket S3 debe ser **privado**. Ningún objeto tiene acceso público.
- Presigned URLs de **subida** expiran en 300 segundos (5 min).
- Presigned URLs de **descarga** expiran en 3600 segundos (1 hora).
- **HeadObject** valida que el archivo exista en S3 antes de crear contratos o adendas.
- Solo se persiste `archivo_s3_key` en BD — **nunca URLs públicas permanentes**.
- Las operaciones S3 están abstraídas en `contract-storage.service.ts`: `validateExistingFile()`, `createUploadUrl()`, `createDownloadUrl()`.

### Política IAM mínima requerida

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:HeadObject"],
    "Resource": "arn:aws:s3:::admin-employee-microservice/contratos/*"
  }]
}
```

### CORS recomendado en el bucket

```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["PUT", "GET", "HEAD"],
  "AllowedOrigins": ["http://localhost:5173"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3000
}]
```

> En producción reemplazar `AllowedOrigins` por el dominio real del frontend.

---

## 14. Integración con otros Microservicios

### → Employee Service (puerto 3002)

Valida que el empleado exista antes de crear cualquier contrato:

```
GET http://employee-service:3002/api/empleados/:empleadoId
  → 200 → empleado existe, continúa
  → 404 → 404 "El empleado no existe en el sistema"
  → falla conexión → 503 "Employee Service no disponible"
```

### → History Service (puerto 3006)

Toda la lógica de auditoría está encapsulada en `ContractAuditService` (`contract-audit.service.ts`).
Cada operación llama a **dos endpoints** del History Service (fire-and-forget):
- `registrarCambio` — registra el campo y valores antes/después
- `registrarAccion` — registra la acción del usuario con resultado

| Evento | Acción registrada |
|--------|-------------------|
| Crear contrato | `contrato_creado` |
| Renovar contrato | `contrato_renovado` |
| Actualizar estado | `contrato_estado_actualizado` |
| Agregar adenda | `adenda_creada` |
| Vencimiento automático | `contrato_vencido_automaticamente` |

La distribución de pagos (`distribucionPago`) se incluye en el `valor_nuevo` de los registros de creación, renovación y adendas.

### ← Employee Service (puerto 3002) — proxy

Employee Service llama al endpoint de contrato activo como proxy para el Consultante:

```
GET /api/contratos/employee/:id/active
  ← datos del contrato activo o null
```

---

## 15. Cómo Ejecutar

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ con base de datos `contract_db` creada

```bash
psql -U postgres -c "CREATE DATABASE contract_db;"
```

### Desarrollo local

```bash
npm install
cp .env.example .env
# Editar .env con valores reales

npm run migrate
npm run dev
# → http://localhost:3003
```

### Verificaciones disponibles

```bash
npm run typecheck  # Verificar tipos TypeScript sin compilar
npm run lint       # Verificar estilo de código
npm run build      # Compilar TypeScript a dist/
```

### Docker

```bash
docker build -t contract-service .
docker run -p 3003:3003 --env-file .env contract-service
```

---

## 16. Pruebas

```bash
npm test                  # Ejecutar todas las pruebas
npm run test:coverage     # Con reporte de cobertura
```

### Casos cubiertos

| ID | Caso | Tipo |
|----|------|------|
| TC-CON-001 | Crear contrato con empleado válido y archivo en S3 | Positivo |
| TC-CON-002 | Crear cuando ya existe contrato activo → 409 | Negativo |
| TC-CON-003 | Crear sin archivo S3 informado → funciona sin s3_key | Positivo |
| TC-CON-004 | Empleado no existe en Employee Service → 404 | Negativo |
| TC-CON-005 | Employee Service no disponible → 503 | Negativo |
| TC-CON-006 | Renovación cierra contrato anterior (transaccional) | Positivo |
| TC-CON-007 | Renovación resuelve previousEndDate automáticamente | Positivo |
| TC-CON-008 | Actualizar estado del contrato (activo/vencido/terminado/suspendido) | Positivo |
| TC-CON-009 | Adenda aplica cambios_json sobre contrato activo | Positivo |
| TC-CON-010 | Adenda sobre contrato no activo → 400 | Negativo |
| TC-CON-011 | Job diario marca vencido contrato con fecha_fin pasada | Positivo |
| TC-CON-012 | Presigned URL de subida generada correctamente | Positivo |
| TC-CON-013 | URL de descarga expira en 1 hora | Positivo |
| TC-CON-014 | Distribución de pagos calculada correctamente por periodicidad | Positivo |
| TC-CON-015 | CONSULTATION no puede crear contratos → 403 | Negativo |
