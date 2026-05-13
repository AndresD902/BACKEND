# Employee Service

> Microservicio 2 de 7 · Puerto **3002** · Base de datos: `employee_db`

Gestión completa del ciclo de vida de empleados: CRUD, historial de cargos y salarios, carga de documentos vía AWS S3 con presigned URLs y flujo de aprobación RRHH, proxy al contrato activo desde contract-service y registro automático de cambios en history-service (fire-and-forget).

---

## Tabla de Contenido

1. [Responsabilidades](#1-responsabilidades)
2. [Tech Stack](#2-tech-stack)
3. [Estructura de Carpetas](#3-estructura-de-carpetas)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Migraciones](#5-migraciones)
6. [API Endpoints](#6-api-endpoints)
7. [Flujos Principales](#7-flujos-principales)
8. [Flujo de Subida de Documentos S3](#8-flujo-de-subida-de-documentos-s3)
9. [Variables de Entorno](#9-variables-de-entorno)
10. [Roles y Permisos](#10-roles-y-permisos)
11. [Integración con otros Microservicios](#11-integración-con-otros-microservicios)
12. [Cómo Ejecutar](#12-cómo-ejecutar)
13. [Pruebas](#13-pruebas)

---

## 1. Responsabilidades

| Función | Descripción |
|---------|-------------|
| CRUD de empleados | Crear, consultar, actualizar y eliminar (con confirmación por nombre) empleados |
| Autoconsulta | Endpoint `/me` para que el Consultante vea solo su propio perfil |
| Historial de cargos | Registrar y consultar cambios de cargo y salario |
| Gestión de documentos | Listar, confirmar, aprobar y rechazar documentos de empleados |
| Subida a S3 | Generar presigned URLs para subida directa desde el cliente |
| Descarga desde S3 | Generar presigned URLs temporales para descarga (1 hora) |
| Flujo de aprobación | Documentos pasan por estado temporal antes de confirmarse como activos |
| Contrato activo | Proxy seguro al contract-service para consultar el último contrato activo |
| Solicitud de corrección | El Consultante puede enviar solicitudes de cambio de información a RRHH |
| Auditoría automática | Envía cambios a history-service (fire-and-forget, nunca bloquea la respuesta) |
| Notificaciones | Llama al auth-service para enviar correos de cambios de empleados |
| Creación de Consultante | Al registrar un empleado, notifica al auth-service para crear la cuenta Consultante |
| Validación JWT | Verifica JWT emitidos por auth-service en cada petición (local, sin HTTP) |

---

## 2. Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18 + TypeScript 5 |
| Framework | Express.js v5 |
| Base de datos | PostgreSQL 14+ con `pg` (sin ORM) |
| Migraciones | node-pg-migrate (TypeScript) |
| Almacenamiento | AWS S3 (presigned URLs con `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) |
| Auth | JWT — verificación local con `jsonwebtoken` y `JWT_SECRET` compartido |
| HTTP Client | axios (llamadas a history-service, contract-service, auth-service) |
| Validación | Zod |
| Pruebas | Jest + ts-jest + supertest |
| Cobertura | > 90% statements/functions/lines · > 80% branches |
| Contenedor | Docker |

---

## 3. Estructura de Carpetas

```
employee-service/
├── migrations/
│   ├── 001_create_empleados.ts
│   ├── 002_create_cargos_salarios.ts
│   └── 003_create_documentos_empleado.ts
├── data/
│   └── departamentos_colombia.json       # 32 departamentos + ciudades de Colombia
├── src/
│   ├── config/
│   │   ├── database.ts                   # Pool pg + connect/disconnect + healthcheck
│   │   ├── env.ts                        # Variables de entorno validadas al arranque
│   │   └── s3.ts                         # Cliente S3 + helpers presigned URL
│   ├── clients/
│   │   ├── historyServiceClient.ts       # POST /historial/cambios (fire-and-forget)
│   │   ├── contractServiceClient.ts      # GET /contratos/empleado/:id/activo
│   │   └── authNotificationClient.ts     # POST /internal/notify-employee-change (fire-and-forget)
│   ├── controllers/
│   │   └── employee.controller.ts
│   ├── dtos/
│   │   └── create-employee.dto.ts        # Zod schema para validación de entrada
│   ├── entities/
│   │   ├── employee.entity.ts
│   │   ├── cargo-salario.entity.ts
│   │   └── documento.entity.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts            # verifyToken — valida JWT localmente
│   │   ├── authorize.middleware.ts       # requireRol — control de acceso por rol
│   │   ├── error-handler.middleware.ts
│   │   └── not-found.middleware.ts
│   ├── repositories/
│   │   ├── interfaces/                   # Contratos DIP
│   │   ├── employee.repository.ts
│   │   ├── cargoSalario.repository.ts
│   │   └── documento.repository.ts
│   ├── routes/
│   │   ├── index.ts
│   │   └── employee.routes.ts
│   ├── services/
│   │   ├── interfaces/                   # Contratos DIP
│   │   └── employee.service.ts
│   ├── shared/
│   │   └── errors/                       # AppError, NotFoundError, ConflictError, etc.
│   ├── utils/
│   │   └── async-handler.util.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   └── unit/                             # 128 tests unitarios
├── .env.example
├── Dockerfile
├── jest.config.ts
├── tsconfig.json
└── tsconfig.build.json
```

---

## 4. Modelo de Datos

### Tabla `departamentos`

```sql
CREATE TABLE departamentos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  codigo_dane VARCHAR(10),
  activo      BOOLEAN DEFAULT TRUE
);
-- Poblada desde data/departamentos_colombia.json (seed automático en migración)
```

### Tabla `empleados`

```sql
CREATE TABLE empleados (
  id                     BIGSERIAL PRIMARY KEY,
  cedula                 VARCHAR(20) UNIQUE NOT NULL,       -- máx. 13 dígitos numéricos
  tipo_documento         VARCHAR(30) CHECK (tipo_documento IN
                           ('cedula_ciudadania','cedula_extranjeria','pasaporte','tarjeta_identidad')),
  nombre                 VARCHAR(100) NOT NULL,             -- solo letras, máx. 50 chars
  apellido               VARCHAR(100) NOT NULL,             -- solo letras, máx. 50 chars
  genero                 VARCHAR(20) CHECK (genero IN ('masculino','femenino','otro','prefiero_no_decir')),
  fecha_nacimiento       DATE,
  celular                VARCHAR(20),                       -- máx. 15 dígitos numéricos
  telefono_fijo          VARCHAR(20),                       -- máx. 10 dígitos, mín. 7
  correo_personal        VARCHAR(150),                      -- real, validado, requerido para Consultante
  correo_corporativo     VARCHAR(150) UNIQUE,
  direccion              TEXT,                              -- sanitizada contra SQL injection
  ciudad                 VARCHAR(100),
  departamento_id        INT REFERENCES departamentos(id),
  nivel_educativo        VARCHAR(50) CHECK (nivel_educativo IN
                           ('bachiller','tecnico','tecnologo','universitario',
                            'especialista','magister','doctorado')),
  estado                 VARCHAR(20) DEFAULT 'activo'
                         CHECK (estado IN ('activo','inactivo','transicion','retirado')),
  justificacion_inactivo VARCHAR(100),
  fecha_ingreso          DATE,
  fecha_retiro           DATE,
  created_at             TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_empleados_cedula          ON empleados(cedula);
CREATE INDEX idx_empleados_estado          ON empleados(estado);
CREATE INDEX idx_empleados_correo_personal ON empleados(correo_personal);
```

### Tabla `cargos_salarios`

```sql
CREATE TABLE cargos_salarios (
  id              BIGSERIAL PRIMARY KEY,
  empleado_id     BIGINT NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  cargo           VARCHAR(100) NOT NULL,
  departamento_id INT REFERENCES departamentos(id),
  salario         DECIMAL(12,2) NOT NULL CHECK (salario <= 100000000),  -- máx. 100M COP
  tipo_salario    VARCHAR(30) DEFAULT 'fijo'
                  CHECK (tipo_salario IN ('fijo','variable','por_hora')),
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE,
  activo          BOOLEAN DEFAULT TRUE,
  motivo_cambio   TEXT,
  registrado_por  VARCHAR(150),
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cargos_empleado_activo ON cargos_salarios(empleado_id, activo);
```

### Tabla `documentos_empleado`

```sql
CREATE TABLE documentos_empleado (
  id              BIGSERIAL PRIMARY KEY,
  empleado_id     BIGINT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL CHECK (tipo IN
                    ('foto','hoja_vida','cert_salud','cert_pension','cert_cesantias',
                     'cert_riesgos','antecedentes','diploma','contrato_firmado','otro')),
  s3_key          TEXT NOT NULL,                    -- solo la clave, nunca URLs públicas
  content_type    VARCHAR(100) CHECK (content_type IN
                    ('image/jpeg','image/png','application/pdf','application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  nombre_original VARCHAR(255),
  tamano_bytes    BIGINT CHECK (tamano_bytes <= 5242880),  -- máx. 5 MB
  estado          VARCHAR(30) DEFAULT 'pendiente_aprobacion'
                  CHECK (estado IN ('pendiente_aprobacion','activo','rechazado')),
  motivo_rechazo  TEXT,
  aprobado_por    VARCHAR(150),
  subido_por      VARCHAR(150),
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documentos_empleado_tipo ON documentos_empleado(empleado_id, tipo, estado);
```

### Consultas útiles

```sql
-- Cargo y salario actual de un empleado
SELECT cargo, departamento_id, salario, tipo_salario, fecha_inicio
FROM cargos_salarios
WHERE empleado_id = $1 AND activo = TRUE
LIMIT 1;

-- Historial completo de cargos
SELECT cargo, salario, fecha_inicio, fecha_fin, motivo_cambio, registrado_por
FROM cargos_salarios
WHERE empleado_id = $1
ORDER BY fecha_inicio DESC;
```

---

## 5. Migraciones

```bash
npm run migrate        # Aplica migraciones pendientes
npm run migrate:down   # Revierte la última migración
```

Orden de ejecución:

```
001_create_empleados.ts          → tabla empleados + enums + índices
002_create_cargos_salarios.ts    → tabla cargos_salarios + FK
003_create_documentos_empleado.ts → tabla documentos_empleado + validaciones S3
```

Las migraciones son idempotentes. En Docker corren automáticamente al iniciar el contenedor.

---

## 6. API Endpoints

Todos los endpoints requieren `Authorization: Bearer <access_token>` salvo `/health`.

Base path: `/api/empleados`

### Empleados

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/` | Listar empleados con filtros y búsqueda (paginado) | ADMIN, HR |
| GET | `/:id` | Detalle del empleado | ADMIN, HR |
| GET | `/me` | Propio perfil del Consultante | CONSULTATION |
| POST | `/` | Registrar empleado (+ cuenta Consultante automática) | ADMIN, HR |
| PATCH | `/:id` | Editar datos de identidad | ADMIN, HR |
| DELETE | `/:id` | Eliminar empleado (requiere confirmar copiando el nombre) | **Solo ADMIN** |
| POST | `/:id/solicitar-correccion` | Enviar solicitud de cambio de información a RRHH | Todos |

### Filtros disponibles en `GET /`

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `estado` | string | `activo`, `inactivo`, `transicion`, `retirado` |
| `q` | string | Búsqueda por nombre, apellido o cédula (máx. 50 chars) |
| `departamento_id` | number | Filtrar por departamento |
| `page` | number | Número de página (default: 1) |
| `limit` | number | Registros por página (default: 20, máx. 100) |

### Cargo y salario

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/:id/cargo-actual` | Cargo y salario activo | Todos |
| GET | `/:id/historial-cargo` | Historial completo de cargos | ADMIN, HR |
| POST | `/:id/cargo` | Registrar nuevo cargo/salario (cierra el anterior) | ADMIN, HR |

### Contrato activo (proxy)

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/:id/contrato-activo` | Proxy seguro al contract-service | Todos |

### Documentos

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/presigned-url` | Generar URL de subida a S3 (Paso A) | ADMIN, HR |
| GET | `/:id/documentos` | Listar documentos del empleado | Todos |
| POST | `/:id/documentos` | Confirmar documento subido a S3 (Paso C) | ADMIN, HR |
| PATCH | `/:id/documentos/:docId/aprobar` | Aprobar documento → S3 definitivo | ADMIN, HR |
| PATCH | `/:id/documentos/:docId/rechazar` | Rechazar y eliminar del S3 temporal | ADMIN, HR |
| GET | `/documentos/:docId/url` | URL de descarga temporal (1 hora) | Todos |

### Exportación y catálogos

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/export/csv` | Exportar listado CSV (BOM UTF-8, compatible Excel) | ADMIN, HR |
| GET | `/departamentos` | Departamentos y ciudades de Colombia | Todos |

### Salud

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Estado del servicio y conexión a BD |

---

### Ejemplos de request / response

**POST `/api/empleados`**
```json
// Request
{
  "cedula": "1234567890",
  "tipoDocumento": "cedula_ciudadania",
  "nombre": "Ana",
  "apellido": "García",
  "genero": "femenino",
  "fechaNacimiento": "1990-05-01",
  "celular": "3001234567",
  "correoPersonal": "ana.garcia@gmail.com",
  "correoCorporativo": "ana.garcia@empresa.com",
  "ciudad": "Bogotá",
  "departamentoId": 1,
  "nivelEducativo": "universitario",
  "fechaIngreso": "2024-01-15",
  "cargo": "Desarrolladora Senior",
  "departamentoCargo": "Tecnología",
  "salario": 6000000,
  "tipoSalario": "fijo",
  "tipoContrato": "indefinido"
}

// Response 201
{
  "success": true,
  "data": { "id": 1, "nombre": "Ana", "apellido": "García", "estado": "activo" }
}
```

**GET `/api/empleados/me`** (Consultante)
```json
// Response 200
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Ana",
    "apellido": "García",
    "estado": "activo",
    "cargoActual": { "cargo": "Desarrolladora Senior", "salario": 6000000 }
  }
}
```

**GET `/api/empleados/:id/contrato-activo`**
```json
// Response 200 — proxy del contract-service
{
  "success": true,
  "data": {
    "id": 5,
    "tipo": "indefinido",
    "salario": 6000000,
    "fecha_inicio": "2024-01-15",
    "estado": "activo"
  }
}

// Response 200 — sin contrato activo
{ "success": true, "data": null }
```

---

## 7. Flujos Principales

### Registrar empleado

```
POST /api/empleados
  1. Verificar JWT (roles: ADMIN, HR)
  2. Validar body con Zod
  3. Validar que la cédula no exista
  4. INSERT en empleados
  5. Si viene cargo → INSERT en cargos_salarios con activo=TRUE
  6. Notificar a auth-service para crear cuenta Consultante con el correo del empleado
     (fire-and-forget — authNotificationClient)
  7. Notificar a history-service: tipo_accion='creacion_empleado'
     (fire-and-forget — historyServiceClient)
  8. Retornar 201 con empleado creado
```

### Cambiar cargo y salario

```
POST /api/empleados/:id/cargo
  1. Verificar JWT (roles: ADMIN, HR)
  2. Buscar cargo activo actual → UPDATE activo=FALSE, fecha_fin=hoy
  3. INSERT en cargos_salarios con activo=TRUE, fecha_inicio=hoy
  4. Notificar a history-service: tipo_accion='cambio_cargo_salario'
  5. Notificar cambio al usuario vía auth-service (fire-and-forget)
  6. Retornar 201 con nuevo cargo
```

### Eliminar empleado (solo ADMIN)

```
DELETE /api/empleados/:id
  1. Verificar JWT (rol: ADMIN)
  2. El frontend muestra modal pidiendo escribir el nombre del empleado para confirmar
  3. Valida que el nombre coincida exactamente
  4. DELETE en cascada: empleado + cargos + documentos (S3 keys)
  5. Eliminar archivos de S3 asociados
  6. Notificar a history-service: tipo_accion='eliminacion_empleado'
  7. Retornar 200 { message: 'Empleado eliminado correctamente' }
```

### Solicitud de corrección de datos

```
POST /api/empleados/:id/solicitar-correccion
  Body: { campo, descripcionError, valorIncorrecto, valorSugerido }
  1. Verificar JWT (cualquier rol)
  2. Enviar correo real a RRHH con los detalles de la corrección
  3. Notificar a history-service: tipo_accion='solicitud_correccion'
  4. Retornar 200 { message: 'Solicitud enviada a RRHH' }
```

---

## 8. Flujo de Subida de Documentos S3

La subida usa **tres pasos** para no exponer credenciales AWS al cliente:

```
Paso A — Obtener presigned URL de subida
POST /api/empleados/presigned-url
Body: { "empleadoId": 1, "tipo": "hoja_vida", "contentType": "application/pdf" }
← { url: "https://s3.amazonaws.com/...", key: "temporal/1_hoja_vida_1234567890.pdf" }
  → URL válida 5 minutos
  → Destino: S3 /temporal/

Paso B — PUT directo del frontend a S3 (NO pasa por el backend)
PUT <url del paso A>
Headers: Content-Type: application/pdf
Body: <bytes del archivo>
← 200 OK de AWS S3

Paso C — Confirmar el documento en BD
POST /api/empleados/:id/documentos
Body: { "tipo": "hoja_vida", "s3Key": "temporal/1_hoja_vida_...", "contentType": "application/pdf",
        "nombreOriginal": "mi-hoja-de-vida.pdf", "tamanoBytes": 204800 }
← 201 Created · estado: 'pendiente_aprobacion'
→ Correo real a RRHH notificando documento pendiente

Aprobación (RRHH)
PATCH /api/empleados/:id/documentos/:docId/aprobar
→ Mueve de S3 /temporal/ a ruta definitiva (/hojas-de-vida/)
→ UPDATE documentos_empleado SET estado='activo', s3_key=<nueva_key>
→ Notifica en History Service: tipo_accion='aprobacion_documento'

Rechazo (RRHH)
PATCH /api/empleados/:id/documentos/:docId/rechazar
Body: { "motivo": "Documento ilegible" }
→ Elimina archivo de S3 /temporal/
→ UPDATE documentos_empleado SET estado='rechazado', motivo_rechazo
→ Notifica al solicitante

Descarga
GET /api/empleados/documentos/:docId/url
← { url: "https://s3.amazonaws.com/...", expiresIn: 3600 }
  → URL válida 1 hora
```

> **Importante:** el archivo físico vive en S3. En BD solo se guarda `s3_key`, nunca URLs públicas permanentes. Sin el Paso C, el archivo existe en S3 pero el sistema no lo reconoce.

### Formatos y tamaños permitidos por tipo de documento

| Tipo | Formatos permitidos | Tamaño máximo |
|------|---------------------|---------------|
| `foto` | JPG, PNG | 2 MB |
| `hoja_vida` | PDF, DOC, DOCX | 5 MB |
| `cert_salud`, `cert_pension`, `cert_cesantias`, `cert_riesgos` | PDF | 5 MB |
| `antecedentes` | PDF | 5 MB |
| `diploma` | PDF, JPG, PNG | 5 MB |
| `contrato_firmado` | PDF | 5 MB |
| `otro` | PDF, JPG, PNG, DOC, DOCX | 5 MB |

---

## 9. Variables de Entorno

```env
# Aplicación
NODE_ENV=development
PORT=3002
SERVICE_NAME=employee-service

# Base de datos
DATABASE_URL=postgresql://postgres:password@localhost:5432/employee_db

# JWT (mismo secreto compartido con auth-service)
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234

# Comunicación entre servicios
HISTORY_SERVICE_URL=http://localhost:3006
CONTRACT_SERVICE_URL=http://localhost:3003
AUTH_SERVICE_URL=http://localhost:3001/api/v1
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion
CORS_ORIGINS=http://localhost:5173
REQUEST_TIMEOUT_MS=5000

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...              # Dejar vacío para usar IAM role en producción
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=hr-system-empleados

# Email RRHH (para documentos pendientes y solicitudes de corrección)
RRHH_EMAIL=rrhh@empresa.com
```

> `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` son opcionales si el servicio corre con un rol IAM en infraestructura AWS. Si están vacíos, el SDK usa la cadena de credenciales por defecto del entorno.

---

## 10. Roles y Permisos

| Acción | ADMIN | HR | CONSULTATION |
|--------|:-----:|:--:|:------------:|
| Listar empleados | ✅ | ✅ | ❌ |
| Ver detalle | ✅ | ✅ | Solo `/me` |
| Registrar empleado | ✅ | ✅ | ❌ |
| Editar empleado | ✅ | ✅ | ❌ |
| **Eliminar empleado** | ✅ | ❌ | ❌ |
| Registrar cargo/salario | ✅ | ✅ | ❌ |
| Ver cargo actual | ✅ | ✅ | ✅ (propio) |
| Ver historial cargos | ✅ | ✅ | ❌ |
| Subir documentos | ✅ | ✅ | ❌ |
| Aprobar/rechazar docs | ✅ | ✅ | ❌ |
| Descargar documentos | ✅ | ✅ | ✅ (propios) |
| Ver contrato activo | ✅ | ✅ | ✅ (propio) |
| Solicitar corrección | ✅ | ✅ | ✅ |
| Exportar CSV | ✅ | ✅ | ❌ |

---

## 11. Integración con otros Microservicios

### JWT compartido (sin HTTP)

Cada microservicio valida el JWT localmente con `JWT_SECRET`. No hay llamada al Auth Service por cada request.

### → History Service (puerto 3006)

Fire-and-forget — nunca bloquea la respuesta principal:

```
Crear empleado      → tipo_accion: 'creacion_empleado'
Editar empleado     → tipo_accion: 'modificacion_empleado' (un registro por campo modificado)
Eliminar empleado   → tipo_accion: 'eliminacion_empleado'
Nuevo cargo/salario → tipo_accion: 'cambio_cargo_salario'
Aprobación doc      → tipo_accion: 'aprobacion_documento'
Solicitud corrección→ tipo_accion: 'solicitud_correccion'
```

### → Contract Service (puerto 3003)

El endpoint `/api/empleados/:id/contrato-activo` actúa como proxy seguro:

```
GET /api/empleados/:id/contrato-activo
  → Verifica que el empleado exista localmente
  → GET http://contract-service:3003/api/contratos/empleado/:id/activo
  → Retorna el contrato o null si no tiene uno activo
  → Si contract-service no responde → 503
```

### → Auth Service (puerto 3001) — notificaciones internas

Fire-and-forget — nunca bloquea la respuesta principal:

```
Registrar empleado → POST /api/v1/internal/notify-employee-change
  Header: x-internal-key: <INTERNAL_API_KEY>
  Body: { userEmail, action: 'EMPLOYEE_CREATED', employeeName }
  → Auth Service crea la cuenta Consultante y envía credenciales por correo

Editar empleado → POST /api/v1/internal/notify-employee-change
  Body: { userEmail, action: 'EMPLOYEE_UPDATED', employeeName }
  → Auth Service envía correo de notificación si notif_cambios = true
```

---

## 12. Cómo Ejecutar

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ con base de datos `employee_db` creada
- Auth Service corriendo en puerto 3001 (para tokens válidos)
- Contract Service corriendo en puerto 3003 (para proxy de contrato activo)
- History Service corriendo en puerto 3006 (para recibir cambios)

```bash
psql -U postgres -c "CREATE DATABASE employee_db;"
```

### Desarrollo local

```bash
npm install
cp .env.example .env
# Editar .env con DATABASE_URL, JWT_SECRET, credenciales AWS, etc.

npm run migrate
npm run dev
# → http://localhost:3002
```

### Producción

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t employee-service .
docker run -p 3002:3002 --env-file .env employee-service
```

---

## 13. Pruebas

```bash
npm test                  # Ejecutar todas las pruebas
npm run test:watch        # Modo watch
npm run test:coverage     # Con reporte de cobertura
```

### Cobertura actual

| Métrica | Umbral | Actual |
|---------|--------|--------|
| Statements | 90% | ~99% |
| Branches | 80% | ~96% |
| Functions | 90% | ~100% |
| Lines | 90% | ~100% |

### Estructura de tests (128 tests unitarios)

```
tests/unit/
├── services/
│   └── employee.service.test.ts       # 12 métodos del servicio
├── controllers/
│   └── employee.controller.test.ts    # 12 handlers HTTP
├── middlewares/
│   ├── auth.middleware.test.ts
│   ├── authorize.middleware.test.ts
│   ├── error-handler.middleware.test.ts
│   └── not-found.middleware.test.ts
├── repositories/
│   ├── employee.repository.test.ts
│   ├── cargoSalario.repository.test.ts
│   └── documento.repository.test.ts
├── clients/
│   └── historyServiceClient.test.ts
├── config/
│   ├── database.test.ts
│   └── s3.test.ts
└── shared/
    └── errors.test.ts
```

### Casos clave

| ID | Caso | Tipo |
|----|------|------|
| TC-EMP-001 | Registrar empleado completo → 201 | Positivo |
| TC-EMP-002 | Cédula duplicada → 409 | Negativo |
| TC-EMP-003 | Nuevo cargo cierra el anterior (activo=false) | Positivo |
| TC-EMP-004 | Filtros de estado (activo/inactivo/transicion/retirado) | Positivo |
| TC-EMP-005 | Búsqueda con más de 50 chars → 400 | Negativo |
| TC-EMP-006 | Documento > 5 MB → 400 | Negativo |
| TC-EMP-007 | Documento con formato inválido → 400 | Negativo |
| TC-EMP-008 | Aprobación → estado activo en BD y S3 definitivo | Positivo |
| TC-EMP-009 | Exportación CSV con cada campo en su columna | Positivo |
| TC-EMP-010 | Editar con rol CONSULTATION → 403 | Negativo |
| TC-EMP-011 | Eliminar empleado con rol HR → 403 | Negativo |
| TC-EMP-012 | Consultante accede solo a su propio perfil (`/me`) | Positivo |
| TC-EMP-013 | Proxy contrato activo → responde con datos de contract-service | Positivo |
| TC-EMP-014 | History fire-and-forget no bloquea aunque falle | Positivo |