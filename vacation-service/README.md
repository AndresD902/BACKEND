# Vacation Service

> Microservicio 4 del sistema HR · Node.js + TypeScript + Express + PostgreSQL · Puerto **3004**

---

## Tabla de Contenido

1. [Inicio Rápido — Levanta el servicio en minutos](#1-inicio-rápido--levanta-el-servicio-en-minutos)
2. [Descripción General](#2-descripción-general)
3. [Responsabilidades](#3-responsabilidades)
4. [Stack Tecnológico](#4-stack-tecnológico)
5. [Estructura de Carpetas](#5-estructura-de-carpetas)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [Migraciones](#7-migraciones)
8. [API REST — Endpoints](#8-api-rest--endpoints)
9. [Reglas de Negocio](#9-reglas-de-negocio)
10. [Flujos Internos](#10-flujos-internos)
11. [Comunicación con otros Microservicios](#11-comunicación-con-otros-microservicios)
12. [Pruebas Unitarias con Vitest](#12-pruebas-unitarias-con-vitest)
13. [Análisis de Calidad con SonarCloud](#13-análisis-de-calidad-con-sonarcloud)
14. [Docker y Ejecución con Docker Compose](#14-docker-y-ejecución-con-docker-compose)
15. [Modelo de Datos](#15-modelo-de-datos)
16. [Seguridad](#16-seguridad)

---

## 1. Inicio Rápido — Levanta el servicio en minutos

> Sigue estos pasos en orden. Si algo falla, revisa la sección de la etapa donde ocurrió el error.

### Requisitos previos

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| PostgreSQL | 15.x | `psql --version` |
| Docker (opcional) | 24.x | `docker -v` |

---

### Opción A — Ejecución local sin Docker

**Paso 1 — Clonar e instalar dependencias**

```bash
git clone <url-del-repo>
cd vacation-service
npm install
```

**Paso 2 — Crear el archivo de variables de entorno**

```bash
cp .env.example .env
```

Abre `.env` y completa los valores marcados con `← CAMBIAR`:

```env
NODE_ENV=development
PORT=3004
SERVICE_NAME=vacation-service

DATABASE_URL=postgres://postgres:password@localhost:5432/vacation_db   # ← CAMBIAR password

JWT_SECRET=clave_super_secreta_minimo_32_caracteres_aqui               # ← CAMBIAR (mínimo 32 caracteres)

HISTORY_SERVICE_URL=http://localhost:3006
EMPLOYEE_SERVICE_URL=http://localhost:3002
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tucorreo@gmail.com       # ← CAMBIAR
SMTP_PASS=tu_app_password_gmail    # ← CAMBIAR (App Password de Gmail, no la contraseña normal)

FRONTEND_URL=http://localhost:5173
DIAS_LEGALES_ANUALES=15
CORS_ORIGINS=http://localhost:5173
```

> **Nota SMTP:** En Gmail debes generar un **App Password** desde  
> `Cuenta de Google → Seguridad → Verificación en dos pasos → Contraseñas de aplicación`.  
> La contraseña normal no funciona con SMTP.

**Paso 3 — Crear la base de datos**

```bash
psql -U postgres -c "CREATE DATABASE vacation_db;"
```

**Paso 4 — Ejecutar migraciones**

```bash
npm run migrate
```

Si es la primera vez, esto crea las tablas `vacaciones`, `dias_disponibles` y `festivos`, y carga los 18 festivos colombianos de 2025.

**Paso 5 — Iniciar el servidor**

```bash
# Modo desarrollo (recarga automática al guardar)
npm run dev

# Modo producción
npm run build && npm start
```

**Paso 6 — Verificar que el servicio está corriendo**

```bash
curl http://localhost:3004/api/health
```

Respuesta esperada:
```json
{ "status": "ok", "service": "vacation-service", "database": "connected" }
```

---

### Opción B — Ejecución con Docker Compose

> Esta opción levanta el servicio y su base de datos PostgreSQL sin necesidad de instalar nada localmente más allá de Docker.

**Paso 1 — Crear el `.env`**

```bash
cp .env.example .env
# Editar .env con los valores reales (mismo proceso que la Opción A)
```

**Paso 2 — Levantar**

```bash
# Solo este servicio y su BD
docker-compose up vacation-service postgres-vacation

# En segundo plano
docker-compose up -d vacation-service postgres-vacation
```

**Paso 3 — Verificar migraciones y estado**

```bash
docker-compose logs vacation-service
# Buscar: "Database connected successfully" y "No migrations to run" o "Migrations complete"

curl http://localhost:3004/api/health
```

**Paso 4 — Detener**

```bash
docker-compose down
# Para eliminar también los volúmenes (borra los datos de BD):
docker-compose down -v
```

---

### Solución de problemas comunes

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `Missing required environment variable: JWT_SECRET` | Falta el `.env` o la variable | Copiar `.env.example` y completarlo |
| `JWT_SECRET must be at least 32 characters` | Clave demasiado corta | Usar una clave de al menos 32 caracteres |
| `ECONNREFUSED 5432` | PostgreSQL no está corriendo | Iniciar PostgreSQL o usar Docker |
| `relation "vacaciones" does not exist` | Las migraciones no corrieron | Ejecutar `npm run migrate` |
| `Error: connect ECONNREFUSED smtp` | SMTP mal configurado | Revisar `SMTP_HOST`, `SMTP_PORT` y credenciales |
| Puerto 3004 ocupado | Otro proceso usa ese puerto | Cambiar `PORT` en `.env` |

---

## 2. Descripción General

El `vacation-service` gestiona todo el ciclo de vida de las solicitudes de vacaciones de los empleados. Es el único microservicio del sistema que combina:

- Lógica de calendario colombiano (festivos almacenados en BD, actualizables sin redesplegar)
- Cálculo de días hábiles excluyendo fines de semana y festivos
- Gestión de disponibilidad por empleado por año
- Notificaciones por correo real (Nodemailer + SMTP)

**No tiene dependencia directa de base de datos con otros servicios.** Las referencias a `empleado_id` son lógicas: se validan opcionalmente vía HTTP REST al Employee Service.

---

## 3. Responsabilidades

- Gestionar solicitudes de vacaciones con validaciones estrictas de negocio
- Calcular días hábiles excluyendo fines de semana y festivos de la tabla `festivos`
- Mantener actualizada la tabla `dias_disponibles` por empleado por año (fuente de verdad de cuántos días le quedan)
- Crear automáticamente el registro `dias_disponibles` para el año actual en la primera solicitud
- Enviar correos a RRHH al crear, aprobar o rechazar una solicitud
- Notificar al History Service en cada evento (fire-and-forget)
- Proveer endpoints de consulta de festivos por año

---

## 4. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18.x |
| Lenguaje | TypeScript 5.x |
| Framework | Express 5.x |
| Base de datos | PostgreSQL 15 |
| Driver BD | pg (node-postgres) — sin ORM |
| Migraciones | node-pg-migrate |
| Correos | Nodemailer + SMTP |
| Autenticación | JWT — validación local (`jsonwebtoken`) |
| Validación | Zod |
| HTTP entre servicios | Axios |
| Testing | **Vitest** + cobertura con **v8** |
| Contenedor | Docker + Docker Compose |

---

## 5. Estructura de Carpetas

```
vacation-service/
├── src/
│   ├── app.ts                          ← Express app: middlewares, rutas, CORS, error handler
│   ├── server.ts                       ← Arranque: conecta BD y escucha el puerto
│   │
│   ├── config/
│   │   ├── env.ts                      ← Variables de entorno validadas (falla rápido si falta algo)
│   │   └── database.ts                 ← Pool de conexiones PostgreSQL
│   │
│   ├── routes/
│   │   ├── index.ts                    ← Router raíz: /health + /vacaciones
│   │   └── vacation.routes.ts          ← Define todos los endpoints con autenticación y validación
│   │
│   ├── controller/
│   │   └── vacation.controller.ts      ← Maneja req/res, extrae parámetros, delega al service
│   │
│   ├── services/
│   │   ├── vacation.service.ts         ← Orquesta el flujo completo de cada operación
│   │   ├── businessRules.service.ts    ← Validaciones de negocio (anticipación, días mínimos, etc.)
│   │   ├── diasDisponibles.service.ts  ← Lógica de obtener/crear dias_disponibles
│   │   └── email.service.ts            ← Envío de correos con Nodemailer (transporter inyectable)
│   │
│   ├── repositories/
│   │   ├── vacation.repository.ts      ← Queries SQL sobre tabla vacaciones
│   │   ├── diasDisponibles.repository.ts ← Queries sobre tabla dias_disponibles
│   │   └── festivos.repository.ts      ← Queries sobre tabla festivos
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts          ← Verifica JWT y controla roles (authenticate / authorize)
│   │   ├── error-handler.middleware.ts ← Manejo centralizado de errores HTTP
│   │   └── validation.middleware.ts    ← Valida req.body con esquemas Zod
│   │
│   ├── dtos/
│   │   ├── create-vacation.dto.ts      ← Esquema Zod para crear solicitud
│   │   └── reject-vacation.dto.ts      ← Esquema Zod para rechazar solicitud
│   │
│   ├── entities/
│   │   ├── vacation.entity.ts          ← Interface TypeScript de Vacation
│   │   ├── diasDisponibles.entity.ts   ← Interface de DiasDisponibles
│   │   └── festivo.entity.ts           ← Interface de Festivo
│   │
│   ├── clients/
│   │   └── historyServiceClient.ts     ← Fire-and-forget al History Service
│   │
│   ├── utils/
│   │   ├── date.util.ts                ← toDateOnly, parseDate, currentYear
│   │   ├── vacation-days.util.ts       ← calcularDiasHabiles, calcularDiasCalendario
│   │   └── async-handler.util.ts       ← Wrapper para async route handlers
│   │
│   └── shared/errors/
│       ├── app-error.ts                ← Clase base para errores HTTP
│       ├── bad-request.error.ts        ← 400
│       ├── conflict.error.ts           ← 409
│       ├── forbidden.error.ts          ← 403
│       ├── not-found.error.ts          ← 404
│       └── unauthorized.error.ts       ← 401
│
├── tests/
│   ├── setup.ts                        ← Variables de entorno para el entorno de test
│   └── unit/
│       ├── utils/
│       │   ├── date.util.test.ts
│       │   ├── vacation-days.util.test.ts
│       │   └── async-handler.util.test.ts
│       ├── shared/
│       │   └── errors.test.ts
│       ├── middlewares/
│       │   ├── auth.middleware.test.ts
│       │   ├── error-handler.middleware.test.ts
│       │   └── validation.middleware.test.ts
│       ├── services/
│       │   ├── businessRules.service.test.ts
│       │   ├── diasDisponibles.service.test.ts
│       │   ├── email.service.test.ts
│       │   └── vacation.service.test.ts
│       ├── controllers/
│       │   └── vacation.controller.test.ts
│       └── clients/
│           └── historyServiceClient.test.ts
│
├── migrations/
│   ├── 001_create_festivos.ts
│   ├── 002_create_vacaciones.ts
│   ├── 003_create_dias_disponibles.ts
│   └── 004_seed_festivos_2025.ts
│
├── vitest.config.ts                    ← Configuración de Vitest + cobertura con v8
├── sonar-project.properties            ← Configuración para SonarCloud
├── Dockerfile
├── .env.example                        ← Plantilla de variables de entorno
└── package.json
```

---

## 6. Variables de Entorno

Copia `.env.example` a `.env` y completa cada valor. El servicio valida las variables al arrancar y falla inmediatamente si falta alguna obligatoria.

```env
# ── Servidor ──────────────────────────────────────────────────────────────────
NODE_ENV=development          # development | production | test
PORT=3004
SERVICE_NAME=vacation-service

# ── Base de datos ─────────────────────────────────────────────────────────────
DATABASE_URL=postgres://postgres:password@localhost:5432/vacation_db

# ── Autenticación JWT ─────────────────────────────────────────────────────────
# Debe ser idéntico al JWT_SECRET de auth-service y todos los demás servicios.
# Mínimo 32 caracteres obligatorio.
JWT_SECRET=reemplaza_esto_con_una_clave_muy_larga_y_segura

# ── Comunicación entre microservicios ─────────────────────────────────────────
HISTORY_SERVICE_URL=http://history-service:3006
EMPLOYEE_SERVICE_URL=http://employee-service:3002
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion

# ── Correo SMTP ───────────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false             # true solo si usas puerto 465
SMTP_USER=rrhh@empresa.com
SMTP_PASS=app_password        # App Password de Gmail, no la contraseña de la cuenta

# ── Frontend (para links en correos) ─────────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── Reglas de negocio ─────────────────────────────────────────────────────────
DIAS_LEGALES_ANUALES=15       # Días de vacaciones por ley (Colombia: 15 hábiles)

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173   # Separar múltiples orígenes con coma
```

> **Nunca subas el `.env` al repositorio.** Ya está en `.gitignore`.

---

## 7. Migraciones

Las migraciones se ejecutan con `node-pg-migrate` y crean el esquema completo de la BD.

```bash
# Ejecutar todas las migraciones pendientes
npm run migrate

# Revertir la última migración
npm run migrate:down
```

Las migraciones también corren automáticamente al iniciar el contenedor Docker.

### Orden de ejecución

| Archivo | Qué crea |
|---------|---------|
| `001_create_festivos` | Tabla `festivos` con índices |
| `002_create_vacaciones` | Tabla `vacaciones` con índices |
| `003_create_dias_disponibles` | Tabla `dias_disponibles` con columna generada |
| `004_seed_festivos_2025` | 18 festivos colombianos del año 2025 |

---

## 8. API REST — Endpoints

Base path: `/api/vacaciones`

Todos los endpoints requieren `Authorization: Bearer <access_token>` en el header.

| Método | Endpoint | Descripción | Roles permitidos |
|--------|----------|-------------|-----------------|
| `GET` | `/empleado/:id` | Listar vacaciones de un empleado | ADMIN, HR, CONSULTATION |
| `GET` | `/empleado/:id/disponibles` | Días disponibles del año actual | ADMIN, HR, CONSULTATION |
| `POST` | `/` | Crear solicitud de vacaciones | ADMIN, HR |
| `PATCH` | `/:id/aprobar` | Aprobar solicitud pendiente | ADMIN, HR |
| `PATCH` | `/:id/rechazar` | Rechazar con motivo obligatorio | ADMIN, HR |
| `PATCH` | `/:id/cancelar` | Cancelar solicitud pendiente | ADMIN, HR |
| `GET` | `/festivos/:anio` | Listar festivos de un año | ADMIN, HR, CONSULTATION |
| `POST` | `/festivos` | Agregar festivo manualmente | ADMIN |
| `GET` | `/health` *(vía `/api/health`)* | Estado del servicio y BD | Público |

### Ejemplos de request / response

**Crear solicitud — `POST /api/vacaciones`**
```json
// Body
{
  "empleado_id": 5,
  "fecha_inicio": "2025-09-01",
  "fecha_fin": "2025-09-12",
  "justificacion": "Vacaciones de fin de año escolar"
}

// Response 201
{
  "id": 15,
  "empleadoId": 5,
  "fechaInicio": "2025-09-01T00:00:00.000Z",
  "fechaFin": "2025-09-12T00:00:00.000Z",
  "diasHabiles": 10,
  "diasCalendario": 12,
  "estado": "pendiente",
  "notificado": true,
  "fechaSolicitud": "2025-07-28T09:00:00.000Z"
}
```

**Rechazar — `PATCH /api/vacaciones/15/rechazar`**
```json
// Body
{ "motivo_rechazo": "Período de alta demanda, reagendar para octubre" }

// Response 200
{
  "id": 15,
  "estado": "rechazada",
  "motivoRechazo": "Período de alta demanda, reagendar para octubre",
  "aprobadoPor": "rrhh@empresa.com"
}
```

**Errores de validación de negocio — `400 Bad Request`**
```json
{ "success": false, "message": "Las vacaciones deben ser de mínimo 5 días hábiles",
  "error": { "code": "BAD_REQUEST_ERROR", "details": null } }

{ "success": false, "message": "La solicitud debe realizarse con al menos 1 mes de anticipación",
  "error": { "code": "BAD_REQUEST_ERROR", "details": null } }

{ "success": false, "message": "El empleado solo tiene 3 días disponibles y solicitó 8",
  "error": { "code": "BAD_REQUEST_ERROR", "details": null } }
```

---

## 9. Reglas de Negocio

Todas las reglas se aplican en este orden al recibir `POST /api/vacaciones`:

| # | Regla | Error |
|---|-------|-------|
| 1 | `fecha_fin` no puede ser anterior a `fecha_inicio` | 400 |
| 2 | `fecha_inicio` debe ser al menos 1 mes desde hoy | 400 |
| 3 | `fecha_inicio` no puede caer en sábado, domingo ni festivo | 400 |
| 4 | Los días hábiles calculados deben ser ≥ 5 | 400 |
| 5 | El empleado debe tener `dias_disponibles` ≥ días solicitados | 400 |
| 6 | No puede solaparse con otra solicitud `pendiente` o `aprobada` | 409 |

**Cálculo de días hábiles:** se itera día a día entre `fecha_inicio` y `fecha_fin` (inclusive), descartando sábados, domingos y cualquier fecha que exista en la tabla `festivos` con `activo = TRUE`.

---

## 10. Flujos Internos

### Solicitar vacaciones (`POST /`)

```
1. Verificar JWT → roles: ADMIN, HR
2. Parsear y validar fechas
3. validarFechasOrden → validarAnticipacion → validarFechaInicioHabil
4. calcularDias (consulta festivos en BD)
5. validarDiasMinimos
6. obtenerOCrear registro dias_disponibles
7. validarDisponibilidad
8. findSolapadas → ConflictError si hay solapamiento
9. INSERT en vacaciones (estado: pendiente)
10. UPDATE dias_pendientes += diasHabiles
11. Enviar correo a RRHH (no bloquea si falla)
12. UPDATE notificado = TRUE
13. registrarCambio → History Service (fire-and-forget)
14. Response 201
```

### Aprobar (`PATCH /:id/aprobar`)

```
1. Verificar JWT → roles: ADMIN, HR
2. findById → 404 si no existe
3. Verificar estado === 'pendiente' → 400 si no
4. UPDATE estado = 'aprobada'
5. UPDATE dias_usados += dias, dias_pendientes -= dias
6. Enviar correo de aprobación
7. registrarCambio (fire-and-forget)
8. Response 200
```

### Rechazar / Cancelar (`PATCH /:id/rechazar` · `PATCH /:id/cancelar`)

```
1. Verificar JWT y estado pendiente
2. UPDATE estado = 'rechazada' | 'cancelada'
3. UPDATE dias_pendientes -= dias  (libera los días reservados)
4. Enviar correo de rechazo (solo en rechazar)
5. registrarCambio (fire-and-forget)
6. Response 200
```

---

## 11. Comunicación con otros Microservicios

```
vacation-service (:3004)
  │
  ├── → History Service (:3006)     POST /api/historial/cambios
  │       Fire-and-forget. Timeout: 3 000 ms.
  │       Si falla, se registra un warning en consola. La operación
  │       principal no se revierte ni bloquea.
  │
  ├── → Employee Service (:3002)    (referencia lógica)
  │       No se valida en tiempo real. El empleado_id es lógico:
  │       el servicio funciona aunque Employee Service esté caído.
  │
  └── → SMTP (Gmail / SendGrid)     Nodemailer
          Las fallas de correo se registran como warning.
          La operación principal (crear/aprobar/rechazar) ya se completó.
```

---

## 12. Pruebas Unitarias con Vitest

### Ejecutar las pruebas

```bash
# Una pasada (CI / verificación rápida)
npm run test

# Modo watch — re-ejecuta al guardar un archivo
npm run test:watch

# Con reporte de cobertura
npm run test:coverage
```

El reporte de cobertura se genera en `./coverage/`:
- **`coverage/index.html`** — reporte visual navegable en el navegador
- **`coverage/lcov.info`** — archivo que consume SonarCloud

### Cobertura actual

| Métrica | Resultado | Umbral mínimo |
|---------|-----------|---------------|
| Statements | 100 % | 80 % |
| Functions | 100 % | 80 % |
| Lines | 100 % | 100 % |
| Branches | ~89 % | 70 % |

### Archivos de prueba — qué cubre cada uno

| Archivo | Módulo cubierto | Casos |
|---------|-----------------|-------|
| `utils/date.util.test.ts` | `toDateOnly`, `parseDate`, `currentYear` | 5 |
| `utils/vacation-days.util.test.ts` | `calcularDiasCalendario`, `calcularDiasHabiles` | 8 |
| `utils/async-handler.util.test.ts` | Wrapper de async handlers Express | 4 |
| `shared/errors.test.ts` | Todos los errores HTTP (`AppError` y subclases) | 8 |
| `middlewares/auth.middleware.test.ts` | `authenticate`, `authorize` | 7 |
| `middlewares/error-handler.middleware.test.ts` | `errorHandler` (AppError, 404, 500) | 3 |
| `middlewares/validation.middleware.test.ts` | `validateRequest` con Zod | 3 |
| `services/businessRules.service.test.ts` | Todas las validaciones de negocio | 14 |
| `services/diasDisponibles.service.test.ts` | `obtenerOCrear`, `obtenerPorEmpleado` | 5 |
| `services/email.service.test.ts` | 3 métodos: happy path + error swallowing + sanitización HTML | 12 |
| `services/vacation.service.test.ts` | Flujo completo: crear, aprobar, rechazar, cancelar | 17 |
| `controllers/vacation.controller.test.ts` | Todos los endpoints del controlador | 9 |
| `clients/historyServiceClient.test.ts` | Envío de payload y manejo silencioso de errores | 2 |
| **Total** | | **97 pruebas** |

### Estrategia de mocks

- **Repositorios:** mockeados con `vi.fn()` — no se necesita BD real
- **EmailService:** el `Transporter` de Nodemailer es inyectable en el constructor (`new EmailService(mockTransporter)`) — no se necesita SMTP real
- **History Service:** `axios.post` mockeado con `vi.mock('axios')`
- **JWT:** `jwt.verify` mockeado con `vi.mock('jsonwebtoken')`
- **Variables de entorno:** definidas en `tests/setup.ts` antes de que se importe cualquier módulo

### Agregar una nueva prueba

1. Crea el archivo en `tests/unit/<capa>/nombre-del-modulo.test.ts`
2. Importa `{ describe, it, expect, vi, beforeEach } from 'vitest'`
3. Mockea las dependencias externas con `vi.mock(...)`
4. Ejecuta `npm run test:watch` para ver los resultados en tiempo real

---

## 13. Análisis de Calidad con SonarCloud

### Configuración

El archivo `sonar-project.properties` ya está en la raíz del proyecto. Antes de ejecutar el análisis, edita dos líneas:

```properties
sonar.organization=your-org        # ← Tu organización en SonarCloud
sonar.projectKey=your-org_vacation-service  # ← Tu clave de proyecto
```

### Pasos para lanzar el análisis

**Paso 1 — Generar el reporte de cobertura (lcov)**

```bash
npm run test:coverage
# Genera: coverage/lcov.info
```

**Paso 2 — Configurar el token**

```bash
# En tu terminal local o en los secrets de CI
export SONAR_TOKEN=tu_token_de_sonarcloud
```

**Paso 3 — Ejecutar el scanner**

```bash
npx sonar-scanner -Dsonar.token=$SONAR_TOKEN
```

### Integración continua (GitHub Actions)

Añade este step en tu workflow después de `npm run test:coverage`:

```yaml
- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@master
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Qué analiza SonarCloud en este proyecto

| Qué | Configuración |
|-----|--------------|
| Fuentes | `src/` |
| Tests | `tests/` |
| Cobertura | `coverage/lcov.info` |
| Excluido del análisis | `node_modules/`, `dist/`, `coverage/`, `migrations/` |
| Excluido de métricas de cobertura | repositorios, entidades, DTOs, rutas, `server.ts`, `app.ts` |

---

## 14. Docker y Ejecución con Docker Compose

### Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3004
CMD ["npm", "start"]
```

### Bloque en `docker-compose.yml`

```yaml
vacation-service:
  build: ./vacation-service
  ports:
    - "3004:3004"
  env_file: ./vacation-service/.env
  depends_on:
    postgres-vacation:
      condition: service_healthy
  restart: on-failure

postgres-vacation:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB:       vacation_db
    POSTGRES_USER:     postgres
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  volumes:
    - postgres_vacation_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d vacation_db"]
    interval: 5s
    timeout: 5s
    retries: 10
```

### Scripts disponibles

```bash
npm run dev              # Servidor en modo desarrollo (ts-node-dev, recarga automática)
npm run build            # Compilar TypeScript → dist/
npm start                # Servidor compilado (producción)
npm run migrate          # Ejecutar migraciones pendientes
npm run migrate:down     # Revertir última migración
npm run test             # Ejecutar pruebas unitarias (Vitest)
npm run test:watch       # Pruebas en modo watch
npm run test:coverage    # Pruebas + reporte de cobertura
npm run lint             # ESLint
npm run format           # Prettier
```

---

## 15. Modelo de Datos

Base de datos: `vacation_db` · 3 tablas

### `vacaciones`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | SERIAL PK | Identificador |
| `empleado_id` | INT | Referencia lógica al empleado (sin FK real) |
| `fecha_inicio` | DATE | Primer día de vacaciones |
| `fecha_fin` | DATE | Último día de vacaciones |
| `dias_habiles` | INT | Calculado automáticamente (excluye fines de semana y festivos) |
| `dias_calendario` | INT | `fecha_fin - fecha_inicio + 1` |
| `estado` | VARCHAR | `pendiente` · `aprobada` · `rechazada` · `cancelada` |
| `justificacion` | TEXT | Motivo opcional del empleado |
| `motivo_rechazo` | TEXT | Requerido al rechazar |
| `aprobado_por` | VARCHAR | Email del usuario que aprobó/rechazó |
| `notificado` | BOOLEAN | `TRUE` tras enviar correo a RRHH |
| `fecha_solicitud` | TIMESTAMP | Creación automática |

### `dias_disponibles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `empleado_id` | INT | Referencia lógica |
| `anio` | INT | Año calendario |
| `dias_totales` | DECIMAL | Días asignados (default: 15) |
| `dias_usados` | DECIMAL | Vacaciones ya aprobadas |
| `dias_pendientes` | DECIMAL | En solicitudes pendientes |
| `dias_disponibles` | DECIMAL | **Columna generada:** `totales - usados - pendientes` |

Lógica de actualización:

| Evento | Operación |
|--------|-----------|
| Solicitud creada | `dias_pendientes += diasHabiles` |
| Solicitud aprobada | `dias_usados += diasHabiles` · `dias_pendientes -= diasHabiles` |
| Solicitud rechazada o cancelada | `dias_pendientes -= diasHabiles` |

### `festivos`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `fecha` | DATE UNIQUE | Fecha del festivo |
| `descripcion` | VARCHAR | Ej: "Día de la Independencia" |
| `anio` | INT | Año del festivo |
| `tipo` | VARCHAR | `nacional` · `regional` · `empresarial` |
| `activo` | BOOLEAN | `false` para desactivar sin eliminar |

---

## 16. Seguridad

| Medida | Implementación |
|--------|---------------|
| **Autenticación** | JWT verificado localmente en cada request. No se llama al Auth Service por request. |
| **Autorización por rol** | `ADMIN` accede a todo. `HR` puede crear/aprobar/rechazar. `CONSULTATION` solo puede leer. |
| **CORS restringido** | Solo los orígenes listados en `CORS_ORIGINS` pueden hacer requests al servicio. |
| **Validación de inputs** | Todos los body de request pasan por esquemas Zod antes de llegar al controlador. |
| **Sanitización en correos** | Los campos de usuario embebidos en HTML de correos son escapados con `escapeHtml()` (previene XSS). |
| **JWT_SECRET mínimo** | El servicio rechaza arrancar si el secret tiene menos de 32 caracteres. |
| **Tamaño de payload** | El body JSON está limitado a **10 KB** (`express.json({ limit: '10kb' })`). |
| **Helmet** | Headers de seguridad HTTP configurados automáticamente. |
| **Variables de entorno** | Credenciales SMTP, JWT_SECRET y DATABASE_URL van en `.env`, nunca en el código. |
| **Columna generada** | `dias_disponibles` es `GENERATED ALWAYS AS` en PostgreSQL — no se puede escribir directamente, lo que evita manipulaciones directas en BD. |

---

*vacation-service · Microservicio 4 del sistema HR · Node.js + TypeScript + Express + PostgreSQL*
