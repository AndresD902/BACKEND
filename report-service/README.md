# Report Service

> Microservicio 5 de 7 · Puerto **3005** · **Sin base de datos propia**

Agregador stateless de reportes. Consolida datos de employee-service, contract-service y vacation-service en tiempo real vía REST. No escribe en ningún microservicio — es de solo lectura. Tolera fallos parciales: si un servicio dependiente falla, retorna el reporte parcial con advertencias.

---

## Tabla de Contenido

1. [Responsabilidades](#1-responsabilidades)
2. [Tech Stack](#2-tech-stack)
3. [Estructura de Carpetas](#3-estructura-de-carpetas)
4. [Variables de Entorno](#4-variables-de-entorno)
5. [API Endpoints](#5-api-endpoints)
6. [Ejemplos de Respuesta](#6-ejemplos-de-respuesta)
7. [Lógica de Agregación](#7-lógica-de-agregación)
8. [Comunicación con otros Microservicios](#8-comunicación-con-otros-microservicios)
9. [Seguridad](#9-seguridad)
10. [Pruebas](#10-pruebas)
11. [Análisis de Calidad — SonarCloud](#11-análisis-de-calidad--sonarcloud)
12. [Cómo Ejecutar](#12-cómo-ejecutar)

---

## 1. Responsabilidades

- Generar la **ficha completa** de un empleado (datos + cargo + contratos + vacaciones)
- Generar el reporte de **estado laboral** (empleados activos con cargo y días disponibles)
- Generar el reporte de **vacaciones** con filtros por fecha y estado
- Generar el reporte de **contratos** con filtros por fecha y estado
- Generar el reporte de **turnover** (empleados retirados en un rango de fechas)
- Exportar el listado de empleados en **CSV** compatible con Excel (BOM UTF-8)
- Registrar cada reporte generado en History Service (auditoría, fire-and-forget)

**Este servicio NO debe:**
- Tener base de datos propia
- Modificar datos en ningún microservicio — exclusivamente peticiones GET
- Contener lógica de negocio de empleados, contratos ni vacaciones

---

## 2. Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18 + TypeScript 5 |
| Framework | Express.js v5 |
| Base de datos | **Ninguna** — stateless aggregator |
| Auth | JWT — verificación local con `jsonwebtoken` |
| HTTP entre servicios | axios (timeout configurable) |
| Seguridad HTTP | helmet |
| Logging | morgan |
| Pruebas | **Vitest** + cobertura con `@vitest/coverage-v8` |
| Contenedor | Docker |

---

## 3. Estructura de Carpetas

```
report-service/
├── src/
│   ├── app.ts                                  # Express setup + middlewares
│   ├── server.ts                               # Server startup
│   ├── config/
│   │   ├── env.ts                              # Variables validadas (falla si falta JWT_SECRET)
│   │   └── database.ts                         # Vacío — no hay BD propia
│   ├── routes/
│   │   ├── index.ts                            # Agregador de rutas
│   │   ├── report.routes.ts                    # Rutas de reportes (requieren JWT)
│   │   └── health.routes.ts                    # Health check (público)
│   ├── controller/
│   │   └── report.controller.ts                # Maneja req/res, audita con History Service
│   ├── services/
│   │   └── report.service.ts                   # Promise.allSettled + tolerancia a fallos
│   ├── repositories/
│   │   └── report.repository.ts                # Re-exporta los HTTP clients como repositorio
│   ├── clients/
│   │   ├── employeeClient.ts                   # Axios → Employee Service (:3002)
│   │   ├── contractClient.ts                   # Axios → Contract Service (:3003) — con normalización
│   │   ├── vacationClient.ts                   # Axios → Vacation Service (:3004) — con normalización
│   │   └── historyClient.ts                    # Axios → History Service (:3006) — fire-and-forget
│   ├── middlewares/
│   │   ├── auth.middleware.ts                  # verifyToken + requireRol
│   │   ├── error-handler.middleware.ts         # Manejo centralizado de errores + 404
│   │   └── validation.middleware.ts            # Validación de query params
│   ├── dtos/
│   │   └── create-report-request.dto.ts        # DTOs de entrada
│   ├── entities/
│   │   └── create-report-request.dto.ts        # Tipos/interfaces de respuesta
│   ├── utils/
│   │   ├── async-handler.util.ts               # Wrapper para async handlers Express
│   │   └── report-formatter.util.ts            # CSV serialization (sin dependencias externas, con BOM)
│   └── shared/
│       ├── errors/
│       │   ├── app-error.ts                    # Error personalizado con código y statusCode
│       │   └── unauthorized.error.ts           # Error de autenticación
│       └── enums/
│           ├── report-status.enum.ts           # SUCCESS | PARTIAL | FAILED
│           └── report-type.enum.ts             # Tipos de reportes disponibles
├── tests/
│   ├── setup.ts
│   └── unit/
│       ├── clients/historyClient.test.ts
│       ├── controllers/report.controller.test.ts
│       ├── middlewares/
│       │   ├── auth.middleware.test.ts
│       │   ├── error-handler.middleware.test.ts
│       │   └── validation.middleware.test.ts
│       ├── services/report.service.test.ts
│       ├── shared/errors/app-error.test.ts
│       └── utils/
│           ├── async-handler.util.test.ts
│           └── report-formatter.util.test.ts
├── vitest.config.ts
├── sonar-project.properties
├── tsconfig.json
├── tsconfig.build.json
├── Dockerfile
└── .env.example
```

---

## 4. Variables de Entorno

| Variable | Obligatoria | Por defecto | Descripción |
|----------|:-----------:|-------------|-------------|
| `JWT_SECRET` | **Sí** | — | Mismo secreto que auth-service. Mínimo 32 chars. |
| `NODE_ENV` | No | `development` | En `production` oculta detalles de error. |
| `PORT` | No | `3005` | Puerto de escucha. |
| `SERVICE_NAME` | No | `report-service` | Aparece en logs y health check. |
| `EMPLOYEE_SERVICE_URL` | No | `http://localhost:3002/api` | URL base del Employee Service. |
| `CONTRACT_SERVICE_URL` | No | `http://localhost:3003/api` | URL base del Contract Service. |
| `VACATION_SERVICE_URL` | No | `http://localhost:3004/api` | URL base del Vacation Service. |
| `HISTORY_SERVICE_URL` | No | `http://localhost:3006` | URL base del History Service. Si falla, no bloquea reportes. |
| `INTERNAL_API_KEY` | Producción | `dev-internal-key-...` en dev | Clave para registrar auditoría en History Service. |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Orígenes permitidos separados por coma. |
| `REQUEST_TIMEOUT_MS` | No | `8000` | Timeout en ms para llamadas HTTP entre servicios. |

```env
# .env de ejemplo
NODE_ENV=development
PORT=3005
SERVICE_NAME=report-service
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234
EMPLOYEE_SERVICE_URL=http://localhost:3002/api
CONTRACT_SERVICE_URL=http://localhost:3003/api
VACATION_SERVICE_URL=http://localhost:3004/api
HISTORY_SERVICE_URL=http://localhost:3006
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion
CORS_ORIGINS=http://localhost:5173
REQUEST_TIMEOUT_MS=8000
```

> **En Docker Compose** las URLs deben usar nombres de contenedores:
> ```env
> EMPLOYEE_SERVICE_URL=http://employee-service:3002/api
> ```

---

## 5. API Endpoints

Base path: `/api/reportes`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/health` | Estado del servicio (stateless) | Público |
| GET | `/reportes/empleado/:id` | Ficha completa de un empleado | ADMIN, HR |
| GET | `/reportes/estado-laboral` | Empleados activos con cargo y días disponibles | Todos |
| GET | `/reportes/vacaciones` | Resumen de vacaciones con filtros | Todos |
| GET | `/reportes/contratos` | Contratos por tipo y estado | Todos |
| GET | `/reportes/turnover` | Empleados retirados en rango de fechas | ADMIN |
| GET | `/reportes/empleados/csv` | Exportación CSV (BOM UTF-8, compatible Excel) | ADMIN, HR |

### Parámetros de query disponibles

| Endpoint | Parámetro | Tipo | Descripción |
|----------|-----------|------|-------------|
| `/vacaciones` | `desde`, `hasta` | `YYYY-MM-DD` | Rango de fechas |
| `/vacaciones` | `estado` | string | `pendiente`, `aprobada`, `rechazada` |
| `/vacaciones` | `empleado_id` | number | Filtrar por empleado específico |
| `/contratos` | `desde`, `hasta` | `YYYY-MM-DD` | Rango de fechas |
| `/contratos` | `estado` | string | `activo`, `vencido`, `terminado` |
| `/contratos` | `empleado_id` | number | Filtrar por empleado específico |
| `/turnover` | `desde`, `hasta` | `YYYY-MM-DD` | **Requeridos** — rango de retiros |

---

## 6. Ejemplos de Respuesta

**GET `/api/reportes/empleado/1`**
```json
{
  "success": true,
  "data": {
    "empleado": {
      "id": 1, "nombre": "Ana", "apellido": "García",
      "correo_corporativo": "ana@empresa.com", "estado": "activo"
    },
    "historial_cargo": [
      { "cargo": "Desarrolladora Senior", "salario": 6000000, "fecha_inicio": "2024-01-01" }
    ],
    "contratos": [{ "tipo_contrato": "indefinido", "fecha_inicio": "2022-03-01", "estado": "activo" }],
    "vacaciones": [{ "estado": "aprobada", "fecha_inicio": "2025-09-01", "dias_habiles": 10 }],
    "disponibles": { "dias_disponibles": 5 },
    "advertencias": [],
    "generado_en": "2025-09-01T10:00:00.000Z"
  }
}
```

> Si un microservicio falla, la sección afectada llega como `null` y la falla queda en `advertencias`:
> ```json
> { "contratos": null, "advertencias": ["No se pudieron obtener contratos: ECONNREFUSED"] }
> ```

**GET `/api/reportes/empleados/csv`**

Devuelve un archivo descargable `empleados_2025-09-01.csv` con:
- BOM UTF-8 (`\uFEFF`) para compatibilidad con Excel en Windows
- Separador `\r\n` (estándar RFC 4180)
- Campos con comas o comillas correctamente escapados

```
ID,Cédula,Tipo Documento,Nombre,Apellido,Género,Fecha Nacimiento,...
1,1234567890,cedula_ciudadania,Ana,García,femenino,1990-05-01,...
```

**GET `/api/reportes/turnover?desde=2025-01-01&hasta=2025-12-31`**
```json
{
  "success": true,
  "data": {
    "data": [{ "id": 5, "nombre": "Carlos", "estado": "retirado", "fecha_retiro": "2025-06-15" }],
    "total": 1,
    "advertencias": [],
    "generado_en": "2025-09-01T10:00:00.000Z"
  }
}
```

---

## 7. Lógica de Agregación

### `getReporteEmpleado` — 5 peticiones en paralelo

```
Promise.allSettled([
  getEmpleado(id),             → datos personales
  getHistorialCargo(id),       → cargos
  getContratosPorEmpleado(id), → contratos
  getVacacionesPorEmpleado(id),→ vacaciones
  getDiasDisponibles(id),      → días disponibles
])

✓ fulfilled → valor incluido en la respuesta
✗ rejected  → null + mensaje en el campo `advertencias`
```

### `getEstadoLaboral` — enriquecimiento individual

```
getEmpleados({ estado: 'activo', limit: 500 })
  └─ por cada empleado (paralelo):
       Promise.allSettled([
         getCargoActual(id),
         getDiasDisponibles(id),
       ])
```

Si el Employee Service falla al listar, retorna inmediatamente con `empleados: []` y una advertencia. Si falla el enriquecimiento de un empleado individual, ese empleado aparece con `cargoActual: null` y `disponibles: null`.

### CSV export — sin dependencias externas

El serializer CSV en `report-formatter.util.ts`:
- Escapa campos con comas, comillas dobles o saltos de línea
- Añade BOM (`\uFEFF`) para compatibilidad con Excel en Windows
- Usa `\r\n` como separador de filas (RFC 4180)

---

## 8. Comunicación con otros Microservicios

```
                 ┌──────────────────┐
                 │  report-service  │  :3005
                 │  (stateless)     │
                 └──────┬───────────┘
                        │ solo lectura (HTTP GET)
       ┌────────────────┼─────────────────┐
       ▼                ▼                 ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│ employee    │  │ contract     │  │  vacation        │
│   :3002     │  │   :3003      │  │    :3004         │
└─────────────┘  └──────────────┘  └──────────────────┘

                 (fire-and-forget)
                 ┌──────────────────┐
                 │  history-svc     │
                 │   :3006          │
                 └──────────────────┘
```

| Cliente | Servicio | Operaciones |
|---------|----------|-------------|
| `employeeClient` | Employee :3002 | `getEmpleados`, `getAllEmpleados`, `getEmpleado`, `getCargoActual`, `getHistorialCargo` |
| `contractClient` | Contract :3003 | `getContratosPorEmpleado`, `getAllContratos` — con normalización y filtrado local |
| `vacationClient` | Vacation :3004 | `getVacacionesPorEmpleado`, `getDiasDisponibles`, `getAllVacaciones` — con normalización |
| `historyClient` | History :3006 | `registrarAccion` — fire-and-forget, errores ignorados |

> Todas las llamadas reenvían el token JWT original del usuario. Ninguna modifica datos.

---

## 9. Seguridad

| Medida | Implementación |
|--------|---------------|
| Autenticación | JWT verificado localmente — sin llamar al Auth Service en cada petición |
| Autorización por rol | `requireRol('ADMIN', 'HR')` en endpoints sensibles |
| Headers de seguridad | `helmet` — CSP, HSTS, X-Frame-Options, etc. |
| Sin exposición interna | En `production` los errores 500 no incluyen mensajes internos |
| Timeout configurable | `REQUEST_TIMEOUT_MS` en todas las llamadas HTTP (default 8s) |
| Fire-and-forget seguro | `historyClient` nunca propaga errores — un fallo de auditoría no afecta el reporte |
| Solo lectura | Nunca realiza peticiones POST/PATCH/DELETE a otros servicios |

---

## 9B. Funcionalidades Implementadas (No documentadas en secciones previas)

### Normalización Adaptadora de Clientes

**contractClient** y **vacationClient** implementan normalización automática que adapta múltiples formatos de respuesta:

#### contractClient.normalizeContract()
Mapea entre formatos snake_case y camelCase:
- `empleado_id` ← `employeeId`
- `tipo_contrato` ← `tipo` / `type`
- `fecha_inicio` ← `startDate`
- `fecha_fin` ← `endDate`
- `metodo_pago` ← `paymentMethod`
- `estado` ← `status`
- Y 6+ campos más

**Razón:** Contract Service puede devolver datos en múltiples formatos; el adaptador garantiza consistencia.

#### vacationClient.normalizeVacation() y normalizeDias()
Mapea entre formatos para vacaciones:
- `empleado_id` ← `empleadoId`
- `fecha_inicio` ← `fechaInicio`
- `dias_habiles` ← `diasHabiles`
- Y más campos

**Razón:** Tolerancia a cambios en formatos de respuesta de Vacation Service.

### Filtrado Local en contractClient

`contractClient.getAllContratos()` implementa `matchesFilters()` que filtra localmente por:
- `empleado_id`: Filtrar por empleado específico
- `estado`: Filtrar por estado (activo, vencido, etc.)
- `desde` / `hasta`: Filtrar por fecha de inicio/fin

**Razón:** Contract Service no soporta bien estos filtros complejos; el cliente aplica filtrado local después de obtener todos los contratos.

### Tolerancia a Fallos con Advertencias

Todos los endpoints de reporte implementan `Promise.allSettled()` que:
- ✅ **Fulfilled:** incluye el dato en la respuesta
- ❌ **Rejected:** agrega mensaje a `advertencias` en lugar de fallar

**Ejemplo:**
```json
{
  "contratos": null,
  "advertencias": ["No se pudieron obtener contratos: ECONNREFUSED"]
}
```

**Propósito:** Si un servicio falla, el reporte se genera parcial pero útil. No hay respuesta 500.

### `unwrapArray()` y `unwrapObject()` — Adaptadores de Estructura

Los clientes de vacation y contract tienen adaptadores que extraen arrays/objetos de respuestas con múltiples estructuras posibles:
- `data` directamente: `[...]`
- Envuelto: `{ data: [...] }`
- Mixto con fallback

**Razón:** Robustez contra cambios en estructura de respuestas de servicios dependientes.

---

## 10. Pruebas

```bash
npm run test              # Ejecutar todas las pruebas
npm run test:watch        # Modo watch
npm run test:coverage     # Generar reporte de cobertura
```

El reporte de cobertura se genera en `coverage/`:
- `coverage/index.html` — visualización interactiva en el navegador
- `coverage/lcov.info` — formato para SonarCloud

### Cobertura actual

| Archivo | Statements | Branches | Functions | Lines |
|---------|:----------:|:--------:|:---------:|:-----:|
| `historyClient.ts` | 100% | 100% | 100% | 100% |
| `report.controller.ts` | 100% | 91.66% | 100% | 100% |
| `auth.middleware.ts` | 100% | 100% | 100% | 100% |
| `error-handler.middleware.ts` | 100% | 87.5% | 100% | 100% |
| `validation.middleware.ts` | 100% | 100% | 100% | 100% |
| `report.service.ts` | 100% | 96% | 100% | 100% |
| `app-error.ts` | 100% | 100% | 100% | 100% |
| `async-handler.util.ts` | 100% | 100% | 100% | 100% |
| `report-formatter.util.ts` | 100% | 100% | 100% | 100% |
| **Total** | **100%** | **95.74%** | **100%** | **100%** |

### Archivos de prueba (85 tests)

| Archivo | Tests | Qué cubre |
|---------|:-----:|-----------|
| `report.service.test.ts` | 22 | Agregación paralela, tolerancia a fallos, filtros, CSV |
| `report.controller.test.ts` | 12 | Todos los endpoints + propagación de errores via asyncHandler |
| `auth.middleware.test.ts` | 9 | verifyToken (JWT), requireRol (403/401) |
| `error-handler.middleware.test.ts` | 7 | AppError vs errores genéricos, dev/prod mode |
| `validation.middleware.test.ts` | 5 | requireQueryParams, parámetros faltantes |
| `report-formatter.util.test.ts` | 14 | toCsvRow, buildEmployeeCsv, empleadoToRow, escaping, BOM |
| `async-handler.util.test.ts` | 4 | Wrapping, propagación de rechazos a next() |
| `historyClient.test.ts` | 4 | Fire-and-forget, warn en fallos, nunca lanza excepciones |
| `app-error.test.ts` | 8 | AppError, UnauthorizedError, herencia |

### Umbrales de cobertura configurados

```
lines:      80%   (actual: 100%)
functions:  80%   (actual: 100%)
statements: 80%   (actual: 100%)
branches:   70%   (actual: 95.74%)
```

---

## 11. Análisis de Calidad — SonarCloud

```bash
# 1. Generar reporte de cobertura
npm run test:coverage
# Genera: coverage/lcov.info

# 2. Configurar token
export SONAR_TOKEN="tu_token_de_sonarcloud"

# 3. Ejecutar análisis
npx sonar-scanner
```

> Editar `sonar-project.properties` y reemplazar `your-org` con la organización real.

### Integración con GitHub Actions

```yaml
- name: Run tests & coverage
  run: npm run test:coverage

- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN:  ${{ secrets.SONAR_TOKEN }}
```

---

## 12. Cómo Ejecutar

### Prerrequisitos

- Node.js 18+
- **No necesita PostgreSQL** — es stateless

### Desarrollo local

```bash
npm install
cp .env.example .env
# Solo necesitas JWT_SECRET y las URLs de los demás servicios

npm run dev
# → http://localhost:3005
```

### Verificar que funciona

```bash
curl http://localhost:3005/api/health
```

```json
{
  "status": "ok",
  "service": "report-service",
  "timestamp": "2025-09-01T10:00:00.000Z",
  "note": "stateless aggregator — no own database"
}
```

### Producción

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t report-service .

docker run -p 3005:3005 \
  -e JWT_SECRET=tu_secreto_de_32_caracteres_aqui \
  -e EMPLOYEE_SERVICE_URL=http://host.docker.internal:3002/api \
  -e CONTRACT_SERVICE_URL=http://host.docker.internal:3003/api \
  -e VACATION_SERVICE_URL=http://host.docker.internal:3004/api \
  -e HISTORY_SERVICE_URL=http://host.docker.internal:3006 \
  report-service
```

### Solución de problemas comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Missing required environment variable: JWT_SECRET` | Falta `.env` | Copiar `.env.example` → `.env` |
| `401 Token inválido` | JWT_SECRET distinto al Auth Service | Verificar que todos los servicios compartan el mismo secreto |
| `ECONNREFUSED localhost:3002` | Employee Service no corre | Iniciar el servicio primero |
| Reporte con datos parciales | Un microservicio falló | Ver campo `advertencias` en la respuesta |