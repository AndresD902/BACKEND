# Employee Service — Microservicio de Gestión de Empleados

> Microservicio 2 de 5 · Puerto 3002 · Base de datos: `employee_db`

Gestión completa del ciclo de vida de empleados: CRUD, historial de cargos y salarios, carga de documentos vía S3 con presigned URLs, y registro automático de cambios en history-service (fire-and-forget).

---

## Tabla de Contenido

1. [Responsabilidades](#responsabilidades)
2. [Tech Stack](#tech-stack)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Modelo de Datos](#modelo-de-datos)
5. [Migraciones](#migraciones)
6. [API Endpoints](#api-endpoints)
7. [Flujo de Subida de Documentos S3](#flujo-de-subida-de-documentos-s3)
8. [Variables de Entorno](#variables-de-entorno)
9. [Roles y Permisos](#roles-y-permisos)
10. [Integración con otros Microservicios](#integración-con-otros-microservicios)
11. [Cómo Ejecutar](#cómo-ejecutar)
12. [Pruebas](#pruebas)

---

## Responsabilidades

| Función | Descripción |
|---------|-------------|
| CRUD de empleados | Crear, consultar, actualizar y desactivar (soft delete) empleados |
| Historial de cargos | Registrar y consultar cambios de cargo y salario |
| Gestión de documentos | Listar y confirmar documentos asociados a cada empleado |
| Subida a S3 | Generar presigned URLs para subida directa desde el cliente |
| Descarga desde S3 | Generar presigned URLs temporales para descarga de archivos |
| Auditoría automática | Enviar cambios a history-service (fire-and-forget, no bloquea la respuesta) |
| Validación de identidad | Verificar JWT emitidos por auth-service en cada petición |

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js v5 |
| Base de Datos | PostgreSQL |
| Migraciones | node-pg-migrate |
| Almacenamiento | AWS S3 (presigned URLs) |
| Auth | JWT (verificación local, secreto compartido) |
| HTTP Client | Axios (llamadas a history-service) |
| Testing | Jest + ts-jest + supertest |
| Cobertura | > 90% (statements/functions/lines), > 80% branches |

---

## Estructura de Carpetas

```
employee-service/
├── migrations/                    # Migraciones de BD (node-pg-migrate)
│   ├── 001_create_empleados.ts
│   ├── 002_create_cargos_salarios.ts
│   └── 003_create_documentos_empleado.ts
├── src/
│   ├── clients/
│   │   └── historyServiceClient.ts    # Cliente HTTP fire-and-forget → history-service
│   ├── config/
│   │   ├── database.ts                # Pool de conexiones PostgreSQL
│   │   ├── env.ts                     # Variables de entorno validadas
│   │   └── s3.ts                      # Cliente S3 + helpers presigned URL
│   ├── controllers/
│   │   └── employee.controller.ts     # Handlers HTTP (arrow fn + asyncHandler)
│   ├── dtos/
│   │   └── create-employee.dto.ts     # Validación de entrada con zod (si aplica)
│   ├── entities/
│   │   ├── employee.entity.ts
│   │   ├── cargo-salario.entity.ts
│   │   └── documento.entity.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts          # verifyToken — valida JWT
│   │   ├── authorize.middleware.ts     # requireRol — control de acceso por rol
│   │   ├── error-handler.middleware.ts # Manejador centralizado de errores
│   │   └── not-found.middleware.ts     # 404 catch-all
│   ├── repositories/
│   │   ├── interfaces/                 # Contratos de repositorio (DIP)
│   │   ├── employee.repository.ts
│   │   ├── cargoSalario.repository.ts
│   │   └── documento.repository.ts
│   ├── routes/
│   │   ├── index.ts                    # Montaje de rutas en /api/empleados
│   │   └── employee.routes.ts
│   ├── services/
│   │   ├── interfaces/                 # Contratos de servicio (DIP)
│   │   └── employee.service.ts
│   ├── shared/
│   │   └── errors/                     # AppError, NotFoundError, ConflictError, etc.
│   ├── utils/
│   │   └── async-handler.util.ts       # Wrapper try/catch para handlers async
│   └── server.ts / app.ts
├── tests/
│   └── unit/                           # 128 tests unitarios
├── jest.config.ts
├── tsconfig.json
├── tsconfig.test.json
└── package.json
```

---

## Modelo de Datos

### Tabla `empleados`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGSERIAL PK | Identificador interno |
| `cedula` | VARCHAR(20) UNIQUE | Número de documento |
| `tipo_documento` | ENUM | `cedula_ciudadania`, `cedula_extranjeria`, `pasaporte`, `tarjeta_identidad` |
| `nombre` | VARCHAR(100) | Nombre(s) |
| `apellido` | VARCHAR(100) | Apellido(s) |
| `genero` | ENUM | `masculino`, `femenino`, `otro`, `prefiero_no_decir` |
| `fecha_nacimiento` | DATE | |
| `celular` | VARCHAR(20) | |
| `telefono_fijo` | VARCHAR(20) | |
| `correo_personal` | VARCHAR(150) | |
| `correo_corporativo` | VARCHAR(150) UNIQUE | Usado para vinculación con auth-service |
| `direccion` | TEXT | |
| `ciudad` | VARCHAR(100) | |
| `departamento` | VARCHAR(100) | |
| `nivel_educativo` | ENUM | `bachiller`, `tecnico`, `tecnologo`, `universitario`, `posgrado` |
| `estado` | ENUM | `activo`, `inactivo`, `vacaciones`, `licencia`, `retirado` |
| `fecha_ingreso` | DATE | |
| `fecha_retiro` | DATE | Se establece en soft delete |
| `created_at` / `updated_at` | TIMESTAMP | |

### Tabla `cargos_salarios`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGSERIAL PK | |
| `empleado_id` | BIGINT FK → empleados | |
| `cargo` | VARCHAR(100) | Título del cargo |
| `departamento` | VARCHAR(100) | |
| `salario` | NUMERIC(12,2) | |
| `fecha_inicio` | DATE | |
| `fecha_fin` | DATE | NULL = cargo actual |
| `created_at` | TIMESTAMP | |

### Tabla `documentos_empleado`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGSERIAL PK | |
| `empleado_id` | BIGINT FK → empleados | |
| `tipo_documento` | VARCHAR(50) | `foto`, `hoja_vida`, `contrato`, etc. |
| `s3_key` | TEXT | Ruta del objeto en S3 |
| `content_type` | VARCHAR(100) | MIME type del archivo |
| `nombre_original` | VARCHAR(255) | Nombre original del archivo |
| `subido_por` | VARCHAR(150) | Email del usuario que subió |
| `created_at` | TIMESTAMP | |

---

## Migraciones

```bash
# Aplicar todas las migraciones pendientes
npm run migrate

# Revertir la última migración
npm run migrate:down
```

Las migraciones usan `node-pg-migrate` con TypeScript. El orden es:
1. `001_create_empleados.ts` — tabla principal + ENUMs + índices
2. `002_create_cargos_salarios.ts` — tabla de historial de cargos
3. `003_create_documentos_empleado.ts` — tabla de documentos con S3 key

---

## API Endpoints

Todos los endpoints requieren `Authorization: Bearer <access_token>` (JWT válido emitido por auth-service).

### Empleados

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/api/empleados` | Todos | Listar empleados (paginado: `?page=1&limit=20`) |
| `GET` | `/api/empleados/:id` | Todos | Obtener empleado por ID |
| `POST` | `/api/empleados` | ADMIN, HR | Crear nuevo empleado |
| `PATCH` | `/api/empleados/:id` | ADMIN, HR | Actualizar datos de empleado |
| `DELETE` | `/api/empleados/:id` | ADMIN | Soft delete (estado → inactivo) |

### Cargo y Salario

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/api/empleados/:id/cargo-actual` | Todos | Obtener cargo y salario activos |
| `GET` | `/api/empleados/:id/historial-cargo` | ADMIN, HR | Historial completo de cargos |
| `POST` | `/api/empleados/:id/cargo` | ADMIN, HR | Registrar nuevo cargo/salario |

### Documentos

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `POST` | `/api/empleados/presigned-url` | ADMIN, HR | Generar URL de subida a S3 |
| `GET` | `/api/empleados/:id/documentos` | Todos | Listar documentos de un empleado |
| `POST` | `/api/empleados/:id/documentos` | ADMIN, HR | Confirmar documento subido a S3 |
| `GET` | `/api/empleados/documentos/:docId/url` | Todos | Generar URL de descarga temporal |

### Salud

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/health` | No | Estado del servicio y BD |

---

## Flujo de Subida de Documentos S3

La subida de archivos usa **tres pasos** para no exponer credenciales AWS al cliente:

```
Paso A — Obtener presigned URL de subida
POST /api/empleados/presigned-url
Body: { "empleadoId": 1, "tipoDocumento": "foto", "contentType": "image/jpeg" }
← { url: "https://s3.amazonaws.com/...", key: "fotos/1_1234567890.jpeg" }

Paso B — PUT directo desde el cliente a S3 (NO pasa por el backend)
PUT <url del paso A>
Headers: Content-Type: image/jpeg
Body: <bytes del archivo>
← 200 OK de AWS S3

Paso C — Confirmar el documento en la base de datos
POST /api/empleados/:id/documentos
Body: { "tipoDocumento": "foto", "s3Key": "fotos/1_1234567890.jpeg",
        "contentType": "image/jpeg", "nombreOriginal": "foto.jpg" }
← 201 Created con el registro del documento
```

> **Importante:** El archivo físico vive en S3. Paso C solo crea el registro en BD.
> Sin Paso C, el archivo existe en S3 pero el sistema no lo reconoce.

Para descargar, usar `GET /documentos/:docId/url` que devuelve una presigned URL con 1 hora de validez.

---

## Variables de Entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | Sí | — | `postgresql://user:pass@host:5432/employee_db` |
| `JWT_SECRET` | Sí | — | Mismo secreto compartido con auth-service |
| `PORT` | No | `3002` | Puerto del servidor |
| `NODE_ENV` | No | `development` | `development`, `production`, `test` |
| `HISTORY_SERVICE_URL` | No | `http://localhost:3006` | URL base de history-service |
| `INTERNAL_API_KEY` | No | `dev-internal-key-...` | Clave para endpoints internos |
| `AWS_REGION` | No | `us-east-1` | Región del bucket S3 |
| `AWS_ACCESS_KEY_ID` | No* | `""` | Credencial AWS |
| `AWS_SECRET_ACCESS_KEY` | No* | `""` | Credencial AWS |
| `S3_BUCKET_NAME` | No* | `""` | Nombre del bucket S3 |

> \* Requeridas si se usan endpoints de documentos/S3.

---

## Roles y Permisos

| Rol | Listar | Ver | Crear | Editar | Eliminar | Cargo | Documentos |
|-----|--------|-----|-------|--------|----------|-------|-----------|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `HR` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `EMPLOYEE` | ✅ | ✅ | ❌ | ❌ | ❌ | Ver actual | Ver propios |

Los roles son validados localmente del JWT — no se consulta auth-service en cada petición.

---

## Integración con otros Microservicios

### ← auth-service (Puerto 3001)
- **JWT compartido**: `verifyToken` valida el token localmente usando `JWT_SECRET`
- El payload incluye `{ id, email, rol }` — no hay llamada HTTP a auth-service

### → history-service (Puerto 3006)
- **Fire-and-forget**: `registrarCambio()` en `historyServiceClient.ts` envía un POST sin esperar respuesta
- Los fallos se loguean como `console.warn` pero NO afectan la respuesta principal
- Se registra en history-service cuando:
  - Se crea un empleado (`campo_modificado: "empleado_creado"`)
  - Se actualiza un empleado (un registro por campo modificado)
  - Se hace soft delete (`campo_modificado: "estado"`, nuevo valor: `"inactivo"`)
  - Se crea un nuevo cargo (`campo_modificado: "cargo_salario_creado"`)

```
employee-service ──POST /api/historial/cambios──► history-service
                   (fire-and-forget, no bloquea)
```

---

## Cómo Ejecutar

### Requisitos previos
- Node.js >= 18
- PostgreSQL >= 14 corriendo
- auth-service corriendo en puerto 3001 (para generar tokens válidos)
- history-service corriendo en puerto 3006 (para recibir cambios)

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con DATABASE_URL, JWT_SECRET, etc.

# 3. Aplicar migraciones
npm run migrate

# 4. Iniciar en modo desarrollo
npm run dev
# → Servidor en http://localhost:3002
```

### Producción

```bash
npm run build
npm start
```

---

## Pruebas

```bash
# Ejecutar todos los tests
npm test

# Con reporte de cobertura
npm run test:coverage
```

### Cobertura actual

| Métrica | Umbral | Actual |
|---------|--------|--------|
| Statements | 90% | ~99% |
| Branches | 80% | ~96% |
| Functions | 90% | ~100% |
| Lines | 90% | ~100% |

### Estructura de tests

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
