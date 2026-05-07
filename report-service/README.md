# Report Service

> Microservicio 5 del sistema HR · Node.js + TypeScript + Express · Puerto **3005**  
> **Agregador stateless** — no tiene base de datos propia. Consolida datos de los demás microservicios y los entrega como reportes o exportaciones CSV.

---

## Tabla de Contenido

1. [Inicio Rápido — Levanta el servicio en minutos](#1-inicio-rápido--levanta-el-servicio-en-minutos)
2. [Descripción General](#2-descripción-general)
3. [Responsabilidades](#3-responsabilidades)
4. [Stack Tecnológico](#4-stack-tecnológico)
5. [Estructura de Carpetas](#5-estructura-de-carpetas)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [API REST — Endpoints](#7-api-rest--endpoints)
8. [Ejemplos de Respuesta](#8-ejemplos-de-respuesta)
9. [Lógica de Agregación](#9-lógica-de-agregación)
10. [Comunicación con otros Microservicios](#10-comunicación-con-otros-microservicios)
11. [Pruebas Unitarias con Vitest](#11-pruebas-unitarias-con-vitest)
12. [Análisis de Calidad con SonarCloud](#12-análisis-de-calidad-con-sonarcloud)
13. [Docker y Ejecución con Docker Compose](#13-docker-y-ejecución-con-docker-compose)
14. [Seguridad](#14-seguridad)

---

## 1. Inicio Rápido — Levanta el servicio en minutos

> Sigue estos pasos en orden. Si algo falla, revisa la tabla de solución de problemas al final de esta sección.

### Requisitos previos

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| Docker (opcional) | 24.x | `docker -v` |

> **Importante:** Este servicio **no necesita PostgreSQL** — es un agregador stateless. Solo necesitas que los otros microservicios estén corriendo (o mockeados) para que funcione completamente.

---

### Opción A — Ejecución local sin Docker

**Paso 1 — Clonar e instalar dependencias**

```bash
git clone <url-del-repo>
cd report-service
npm install
```

**Paso 2 — Crear el archivo de variables de entorno**

```bash
cp .env.example .env
```

Abre `.env` y ajusta los valores marcados con `← CAMBIAR`:

```env
NODE_ENV=development
PORT=3005
SERVICE_NAME=report-service

# Misma clave JWT que usan todos los demás servicios  ← CAMBIAR
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234

# URLs de los servicios dependientes (ajusta si usas puertos diferentes)
EMPLOYEE_SERVICE_URL=http://localhost:3002/api   # ← CAMBIAR si el servicio corre en otro host
CONTRACT_SERVICE_URL=http://localhost:3003/api   # ← CAMBIAR si el servicio corre en otro host
VACATION_SERVICE_URL=http://localhost:3004/api   # ← CAMBIAR si el servicio corre en otro host
HISTORY_SERVICE_URL=http://localhost:3006        # ← CAMBIAR si el servicio corre en otro host

# Timeout para llamadas HTTP entre microservicios (ms)
REQUEST_TIMEOUT_MS=8000
```

> **Nota:** El `JWT_SECRET` debe ser exactamente el mismo que usa el **Auth Service** para firmar los tokens. Si no coincide, todas las peticiones fallarán con `401 Token inválido`.

**Paso 3 — Iniciar el servidor**

```bash
# Modo desarrollo (recarga automática al guardar)
npm run dev

# Modo producción
npm run build && npm start
```

**Paso 4 — Verificar que el servicio está corriendo**

```bash
curl http://localhost:3005/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "report-service",
  "timestamp": "2025-09-01T10:00:00.000Z",
  "note": "stateless aggregator — no own database"
}
```

**Paso 5 — Probar un endpoint de reporte** (requiere token JWT válido)

```bash
curl -H "Authorization: Bearer <tu-token>" \
     http://localhost:3005/api/reportes/estado-laboral
```

---

### Opción B — Ejecución con Docker Compose

> Esta opción es la recomendada si ya tienes el sistema completo levantado con Docker Compose. El report-service no necesita base de datos propia, pero sí necesita red con los demás servicios.

**Paso 1 — Crear el `.env`**

```bash
cp .env.example .env
# Editar con las URLs internas de Docker Compose:
#   EMPLOYEE_SERVICE_URL=http://employee-service:3002/api
#   CONTRACT_SERVICE_URL=http://contract-service:3003/api
#   VACATION_SERVICE_URL=http://vacation-service:3004/api
#   HISTORY_SERVICE_URL=http://history-service:3006
```

**Paso 2 — Levantar solo el report-service**

```bash
docker-compose up report-service

# En segundo plano
docker-compose up -d report-service
```

**Paso 3 — Verificar estado**

```bash
docker-compose logs report-service
# Buscar: "report-service running on port 3005 (stateless aggregator)"

curl http://localhost:3005/api/health
```

**Paso 4 — Detener**

```bash
docker-compose down
```

---

### Solución de problemas comunes

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `Missing required environment variable: JWT_SECRET` | Falta el `.env` o la variable | Copiar `.env.example` → `.env` y completar |
| `401 Token inválido o expirado` | JWT_SECRET diferente al Auth Service | Verificar que el mismo secreto esté en todos los `.env` |
| `ECONNREFUSED localhost:3002` | Employee Service no está corriendo | Iniciar el employee-service antes de hacer peticiones |
| `Cannot find module` al arrancar | Dependencias no instaladas | Ejecutar `npm install` |
| Puerto 3005 ocupado | Otro proceso usa ese puerto | Cambiar `PORT` en `.env` |
| Reporte retorna datos parciales | Un microservicio dependiente falló | Ver el campo `advertencias` en la respuesta — indica qué falló |

---

## 2. Descripción General

El `report-service` es el **agregador central de reportes** del sistema. A diferencia de los demás microservicios, **no tiene base de datos propia**. Su función exclusiva es:

1. Recibir una petición de reporte autenticada (JWT).
2. Consultar en paralelo los microservicios correspondientes (employee, contract, vacation).
3. Consolidar y transformar los datos.
4. Devolver la respuesta enriquecida al cliente.
5. Registrar la acción en el History Service (fire-and-forget, nunca bloquea).

Este diseño lo hace **completamente stateless**: puede escalarse horizontalmente sin coordinación, no tiene estado local y puede reiniciarse sin pérdida de datos.

**Tolerancia a fallos:** usa `Promise.allSettled` para que un microservicio caído solo afecte su sección del reporte, no el reporte completo. Las fallas parciales se informan en el campo `advertencias` de la respuesta.

---

## 3. Responsabilidades

- Generar la **ficha completa** de un empleado (datos personales + cargo actual + contratos + vacaciones)
- Generar el reporte de **estado laboral** (todos los empleados activos con cargo y días disponibles)
- Generar el reporte de **vacaciones** con filtros por fecha y estado
- Generar el reporte de **contratos** con filtros por fecha y estado
- Generar el reporte de **turnover** (empleados retirados en un rango de fechas)
- Exportar el listado de empleados en formato **CSV** compatible con Excel (con BOM UTF-8)
- Registrar cada reporte generado en el History Service (auditoría, fire-and-forget)

**Este servicio NO debe:**
- Tener lógica de negocio de empleados (eso es Employee Service :3002)
- Gestionar contratos (eso es Contract Service :3003)
- Gestionar vacaciones (eso es Vacation Service :3004)
- Tener base de datos propia
- Modificar datos en ningún microservicio — es de **solo lectura**

---

## 4. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18.x |
| Lenguaje | TypeScript 5.x |
| Framework | Express 5.x |
| Base de datos | **Ninguna** (stateless aggregator) |
| Autenticación | JWT — validación local (`jsonwebtoken`) |
| HTTP entre servicios | Axios (timeout configurable) |
| Seguridad HTTP | Helmet |
| Logging | Morgan |
| Testing | **Vitest** + cobertura con **v8** |
| Contenedor | Docker + Docker Compose |

---

## 5. Estructura de Carpetas

```
report-service/
├── src/
│   ├── app.ts                            ← Express: middlewares, rutas, CORS, error handler
│   ├── server.ts                         ← Bootstrap: escucha el puerto, shutdown graceful
│   │
│   ├── config/
│   │   ├── env.ts                        ← Variables de entorno validadas (falla rápido si falta JWT_SECRET)
│   │   └── database.ts                   ← Vacío — no hay BD propia
│   │
│   ├── routes/
│   │   ├── index.ts                      ← Router raíz: /health + /reportes
│   │   ├── report.routes.ts              ← Define los 6 endpoints con autenticación por rol
│   │   └── health.routes.ts              ← GET /health — devuelve estado del servicio
│   │
│   ├── controller/
│   │   └── report.controller.ts          ← Extrae params, delega al service, responde y audita
│   │
│   ├── services/
│   │   └── report.service.ts             ← Orquesta llamadas paralelas con Promise.allSettled
│   │
│   ├── repositories/
│   │   └── report.repository.ts          ← Re-exporta los HTTP clients como capa de repositorio
│   │
│   ├── clients/
│   │   ├── employeeClient.ts             ← Axios → Employee Service (:3002)
│   │   ├── contractClient.ts             ← Axios → Contract Service (:3003)
│   │   ├── vacationClient.ts             ← Axios → Vacation Service (:3004)
│   │   └── historyClient.ts              ← Axios → History Service (:3006) — fire-and-forget
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts            ← verifyToken + requireRol (sin llamar al Auth Service)
│   │   ├── error-handler.middleware.ts   ← errorHandler global + notFoundHandler
│   │   └── validation.middleware.ts      ← requireQueryParams (valida parámetros de query)
│   │
│   ├── dtos/
│   │   └── create-report-request.dto.ts  ← Interfaces TypeScript de filtros de entrada
│   │
│   ├── entities/
│   │   └── create-report-request.dto.ts  ← Tipos de respuesta (ReporteEmpleado, ReporteEstadoLaboral)
│   │
│   ├── utils/
│   │   ├── async-handler.util.ts         ← Wrapper para route handlers async
│   │   └── report-formatter.util.ts      ← Serialización CSV (sin dependencias externas)
│   │
│   └── shared/
│       ├── errors/
│       │   ├── app-error.ts              ← Clase base para errores HTTP tipados
│       │   └── unauthorized.error.ts     ← 401 Unauthorized
│       └── enums/
│           ├── report-status.enum.ts     ← SUCCESS | PARTIAL | FAILED
│           └── report-type.enum.ts       ← 6 tipos de reporte
│
├── tests/
│   ├── setup.ts                          ← Variables de entorno para pruebas
│   └── unit/
│       ├── clients/
│       │   └── historyClient.test.ts     ← Fire-and-forget + manejo de errores
│       ├── controllers/
│       │   └── report.controller.test.ts ← Todos los endpoints + propagación de errores
│       ├── middlewares/
│       │   ├── auth.middleware.test.ts
│       │   ├── error-handler.middleware.test.ts
│       │   └── validation.middleware.test.ts
│       ├── services/
│       │   └── report.service.test.ts    ← Lógica de agregación + tolerancia a fallos
│       ├── shared/errors/
│       │   └── app-error.test.ts         ← AppError + UnauthorizedError
│       └── utils/
│           ├── async-handler.util.test.ts
│           └── report-formatter.util.test.ts ← CSV serialización + escaping
│
├── vitest.config.ts                      ← Configuración Vitest + cobertura v8
├── sonar-project.properties              ← Configuración SonarCloud
├── jest.config.js                        ← Configuración Jest (legacy, conservada)
├── tsconfig.json
├── tsconfig.build.json
├── tsconfig.test.json
├── Dockerfile
├── .env.example
└── package.json
```

---

## 6. Variables de Entorno

| Variable | Obligatoria | Por defecto | Descripción |
|----------|------------|-------------|-------------|
| `JWT_SECRET` | **Sí** | — | Clave para verificar tokens JWT. Debe ser la misma en todos los servicios. Mínimo 32 caracteres. |
| `NODE_ENV` | No | `development` | Entorno de ejecución. En `production` oculta detalles de error. |
| `PORT` | No | `3005` | Puerto donde escucha el servicio. |
| `SERVICE_NAME` | No | `report-service` | Nombre que aparece en logs y en el health check. |
| `EMPLOYEE_SERVICE_URL` | No | `http://localhost:3002/api` | URL base del Employee Service. |
| `CONTRACT_SERVICE_URL` | No | `http://localhost:3003/api` | URL base del Contract Service. |
| `VACATION_SERVICE_URL` | No | `http://localhost:3004/api` | URL base del Vacation Service. |
| `HISTORY_SERVICE_URL` | No | `http://localhost:3006` | URL base del History Service (auditoría). Si falla, no bloquea reportes. |
| `REQUEST_TIMEOUT_MS` | No | `8000` | Timeout en milisegundos para llamadas HTTP entre servicios. |

> **En Docker Compose**, las URLs deben usar los nombres de los contenedores en lugar de `localhost`:
> ```env
> EMPLOYEE_SERVICE_URL=http://employee-service:3002/api
> ```

---

## 7. API REST — Endpoints

Base path: `/api/reportes`

| Método | Endpoint | Descripción | Roles permitidos |
|--------|----------|-------------|-----------------|
| GET | `/health` | Estado del servicio | Público |
| GET | `/reportes/empleado/:id` | Ficha completa de un empleado | ADMIN, HR |
| GET | `/reportes/estado-laboral` | Todos los empleados activos con cargo y días disponibles | Todos (autenticados) |
| GET | `/reportes/vacaciones` | Resumen de vacaciones con filtros opcionales | Todos (autenticados) |
| GET | `/reportes/contratos` | Resumen de contratos con filtros opcionales | Todos (autenticados) |
| GET | `/reportes/turnover` | Empleados retirados en un rango de fechas | Todos (autenticados) |
| GET | `/reportes/empleados/csv` | Exportación CSV del listado de empleados | ADMIN, HR |

### Parámetros de query disponibles

| Endpoint | Parámetro | Tipo | Descripción |
|----------|-----------|------|-------------|
| `/vacaciones` | `desde` | `YYYY-MM-DD` | Fecha de inicio del filtro |
| `/vacaciones` | `hasta` | `YYYY-MM-DD` | Fecha de fin del filtro |
| `/vacaciones` | `estado` | string | Estado de la vacación (`pendiente`, `aprobada`, `rechazada`) |
| `/contratos` | `desde` | `YYYY-MM-DD` | Fecha de inicio del filtro |
| `/contratos` | `hasta` | `YYYY-MM-DD` | Fecha de fin del filtro |
| `/contratos` | `estado` | string | Estado del contrato (`activo`, `finalizado`) |
| `/turnover` | `desde` | `YYYY-MM-DD` | Inicio del rango de retiros |
| `/turnover` | `hasta` | `YYYY-MM-DD` | Fin del rango de retiros |

---

## 8. Ejemplos de Respuesta

### GET `/api/reportes/empleado/1`

```jsonc
{
  "success": true,
  "data": {
    "empleado": {
      "id": 1,
      "nombre": "Ana",
      "apellido": "García",
      "correo_corporativo": "ana.garcia@empresa.com",
      "estado": "activo"
    },
    "historial_cargo": [
      { "cargo": "Desarrolladora Senior", "salario": 6000000, "fecha_inicio": "2024-01-01" }
    ],
    "contratos": [
      { "tipo": "indefinido", "fecha_inicio": "2022-03-01" }
    ],
    "vacaciones": [
      { "estado": "aprobada", "fecha_inicio": "2025-09-01", "dias_habiles": 10 }
    ],
    "disponibles": { "dias_disponibles": 5 },
    "advertencias": [],                          // vacío = todo OK
    "generado_en": "2025-09-01T10:00:00.000Z"
  }
}
```

> Si algún microservicio falla, su sección llega como `null` y la falla queda en `advertencias`:
> ```jsonc
> {
>   "contratos": null,
>   "advertencias": ["No se pudieron obtener contratos: ECONNREFUSED"]
> }
> ```

### GET `/api/reportes/empleados/csv`

Devuelve un archivo descargable `empleados_2025-09-01.csv` con BOM UTF-8 para compatibilidad con Excel:

```
ID,Cédula,Tipo Documento,Nombre,Apellido,Género,Fecha Nacimiento,...
1,1234567890,cedula_ciudadania,Ana,García,femenino,1990-05-01,...
```

### GET `/api/reportes/turnover?desde=2025-01-01&hasta=2025-12-31`

```jsonc
{
  "success": true,
  "data": {
    "data": [
      { "id": 5, "nombre": "Carlos", "apellido": "Ruiz", "estado": "retirado", "fecha_retiro": "2025-06-15" }
    ],
    "total": 1,
    "advertencias": [],
    "generado_en": "2025-09-01T10:00:00.000Z"
  }
}
```

---

## 9. Lógica de Agregación

### Tolerancia a fallos con `Promise.allSettled`

El método `getReporteEmpleado` lanza **5 peticiones en paralelo** y recoge todas las respuestas, exitosas o fallidas:

```
┌─────────────────────────────────────────────────┐
│              getReporteEmpleado(id)              │
│                                                  │
│  Promise.allSettled([                            │
│    getEmpleado(id),          → datos personales  │
│    getHistorialCargo(id),    → cargos            │
│    getContratosPorEmpleado(id), → contratos      │
│    getVacacionesPorEmpleado(id), → vacaciones    │
│    getDiasDisponibles(id),   → días disponibles  │
│  ])                                              │
│                                                  │
│  ✓ fulfilled → valor incluido en respuesta       │
│  ✗ rejected  → null + mensaje en advertencias    │
└─────────────────────────────────────────────────┘
```

### Estado laboral — enriquecimiento individual

`getEstadoLaboral` obtiene primero el listado de empleados activos y luego enriquece cada uno con su cargo y días disponibles en paralelo:

```
getEmpleados({ estado: 'activo', limit: 500 })
  └─ por cada empleado:
       Promise.allSettled([
         getCargoActual(id),
         getDiasDisponibles(id),
       ])
```

Si el **Employee Service** falla al listar empleados, el reporte retorna inmediatamente con `empleados: []` y una advertencia. Si falla el enriquecimiento de un empleado individual, ese empleado aparece con `cargo_actual: null` y `disponibles: null`.

### CSV export

El serializer CSV interno (`report-formatter.util.ts`) no tiene dependencias externas:
- Escapa campos con comas, comillas o saltos de línea
- Usa separador `\r\n` (estándar RFC 4180)
- Añade BOM (`﻿`) para compatibilidad con Excel en Windows

---

## 10. Comunicación con otros Microservicios

```
                    ┌──────────────────┐
                    │  report-service  │  :3005
                    │  (stateless)     │
                    └──────┬───────────┘
                           │ solo lectura (HTTP GET)
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
  ┌───────────────┐ ┌──────────────┐ ┌─────────────────┐
  │ employee-svc  │ │ contract-svc │ │  vacation-svc   │
  │   :3002       │ │   :3003      │ │    :3004        │
  └───────────────┘ └──────────────┘ └─────────────────┘
          
                    (fire-and-forget)
                    ┌──────────────────┐
                    │  history-svc     │
                    │   :3006          │
                    └──────────────────┘
```

| Cliente | Servicio destino | Llamadas realizadas |
|---------|-----------------|---------------------|
| `employeeClient` | Employee Service :3002 | `getEmpleados`, `getAllEmpleados`, `getEmpleado`, `getCargoActual`, `getHistorialCargo` |
| `contractClient` | Contract Service :3003 | `getContratosPorEmpleado`, `getAllContratos` |
| `vacationClient` | Vacation Service :3004 | `getVacacionesPorEmpleado`, `getDiasDisponibles`, `getAllVacaciones` |
| `historyClient` | History Service :3006 | `registrarAccion` — no bloquea, errores ignorados |

> Todas las llamadas entre servicios reenvían el token JWT original del usuario (`Authorization: Bearer ...`). Ninguna llamada modifica datos — solo lectura.

---

## 11. Pruebas Unitarias con Vitest

### Ejecutar pruebas

```bash
# Ejecutar todas las pruebas una vez
npm run test

# Modo watch (re-ejecuta al guardar cambios)
npm run test:watch

# Ejecutar y generar reporte de cobertura
npm run test:coverage
```

El reporte de cobertura se genera en `coverage/`:
- `coverage/index.html` — visualización interactiva en el navegador
- `coverage/lcov.info` — formato para SonarCloud

### Resultado de cobertura

| Archivo | Statements | Branches | Functions | Lines |
|---------|-----------|---------|-----------|-------|
| `historyClient.ts` | 100% | 100% | 100% | 100% |
| `report.controller.ts` | 100% | 91.66% | 100% | 100% |
| `auth.middleware.ts` | 100% | 100% | 100% | 100% |
| `error-handler.middleware.ts` | 100% | 87.5% | 100% | 100% |
| `validation.middleware.ts` | 100% | 100% | 100% | 100% |
| `report.service.ts` | 100% | 96% | 100% | 100% |
| `app-error.ts` | 100% | 100% | 100% | 100% |
| `unauthorized.error.ts` | 100% | 100% | 100% | 100% |
| `async-handler.util.ts` | 100% | 100% | 100% | 100% |
| `report-formatter.util.ts` | 100% | 100% | 100% | 100% |
| **Total** | **100%** | **95.74%** | **100%** | **100%** |

### Archivos de prueba

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `services/report.service.test.ts` | 22 | Agregación paralela, tolerancia a fallos, filtros, CSV |
| `controllers/report.controller.test.ts` | 12 | Todos los endpoints, propagación de errores via asyncHandler |
| `middlewares/auth.middleware.test.ts` | 9 | verifyToken (JWT), requireRol (403/401) |
| `middlewares/error-handler.middleware.test.ts` | 7 | AppError vs errores genéricos, dev/prod mode |
| `middlewares/validation.middleware.test.ts` | 5 | requireQueryParams, parámetros faltantes |
| `utils/report-formatter.util.test.ts` | 14 | toCsvRow, buildEmployeeCsv, empleadoToRow, escaping |
| `utils/async-handler.util.test.ts` | 4 | Wrapping, propagación de rechazos a next() |
| `clients/historyClient.test.ts` | 4 | Fire-and-forget, warn en fallos, no lanza excepciones |
| `shared/errors/app-error.test.ts` | 8 | AppError, UnauthorizedError, herencia |
| **Total** | **85** | |

### Umbrales de cobertura configurados

```
lines:      80%   (actual: 100%)
functions:  80%   (actual: 100%)
statements: 80%   (actual: 100%)
branches:   70%   (actual: 95.74%)
```

---

## 12. Análisis de Calidad con SonarCloud

### Paso 1 — Configurar el token

```bash
# Windows PowerShell
$env:SONAR_TOKEN="tu_token_de_sonarcloud"

# Linux / macOS
export SONAR_TOKEN="tu_token_de_sonarcloud"
```

### Paso 2 — Generar el reporte de cobertura

```bash
npm run test:coverage
# Genera: coverage/lcov.info
```

### Paso 3 — Ejecutar el análisis

```bash
npx sonar-scanner
```

> **Antes de ejecutar:** edita `sonar-project.properties` y reemplaza `your-org` con tu organización real de SonarCloud.

### Integración con GitHub Actions

```yaml
- name: Run tests & coverage
  run: npm run test:coverage

- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

---

## 13. Docker y Ejecución con Docker Compose

### Build de la imagen

```bash
docker build -t report-service .
```

### Ejecutar con Docker directamente

```bash
docker run -p 3005:3005 \
  -e JWT_SECRET=tu_secreto_de_32_caracteres_aqui \
  -e EMPLOYEE_SERVICE_URL=http://host.docker.internal:3002/api \
  -e CONTRACT_SERVICE_URL=http://host.docker.internal:3003/api \
  -e VACATION_SERVICE_URL=http://host.docker.internal:3004/api \
  -e HISTORY_SERVICE_URL=http://host.docker.internal:3006 \
  report-service
```

### Variables en `docker-compose.yml` (referencia)

```yaml
report-service:
  build: ./report-service
  ports:
    - "3005:3005"
  environment:
    NODE_ENV: production
    PORT: 3005
    JWT_SECRET: ${JWT_SECRET}
    EMPLOYEE_SERVICE_URL: http://employee-service:3002/api
    CONTRACT_SERVICE_URL: http://contract-service:3003/api
    VACATION_SERVICE_URL: http://vacation-service:3004/api
    HISTORY_SERVICE_URL: http://history-service:3006
    REQUEST_TIMEOUT_MS: 8000
  depends_on:
    - employee-service
    - contract-service
    - vacation-service
```

---

## 14. Seguridad

| Medida | Implementación |
|--------|---------------|
| Autenticación | JWT verificado localmente con `jsonwebtoken` — sin llamar al Auth Service en cada petición |
| Autorización por rol | `requireRol('ADMIN', 'HR')` en endpoints sensibles; roles extraídos del token |
| Headers de seguridad | `helmet` — aplica 11 headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.) |
| Sin exposición de detalles en producción | En `NODE_ENV=production` los errores 500 no incluyen el mensaje interno |
| Propagación del token | El token original del usuario se reenvía a los servicios dependientes — nunca se reutilizan tokens internos |
| Timeout configurable | Todas las llamadas HTTP tienen `REQUEST_TIMEOUT_MS` (default 8 s) para evitar cuelgues |
| Fire-and-forget seguro | El historyClient nunca propaga errores — un fallo de auditoría no afecta el reporte entregado |
| Solo lectura | El report-service **nunca escribe datos** en ningún servicio — exclusivamente peticiones GET |
