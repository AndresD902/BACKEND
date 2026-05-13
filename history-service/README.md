# History Service

> Microservicio 6 de 7 · Puerto **3006** · Base de datos: `history_db`

Registro centralizado de auditoría. Captura cambios de datos de empleados y acciones del sistema enviados por los demás microservicios vía fire-and-forget. Los endpoints de escritura no requieren JWT para no bloquear el flujo principal del llamador — están protegidos por `INTERNAL_API_KEY`.

---

## Tabla de Contenido

1. [Responsabilidades](#1-responsabilidades)
2. [Tech Stack](#2-tech-stack)
3. [Estructura de Carpetas](#3-estructura-de-carpetas)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Migraciones](#5-migraciones)
6. [API Endpoints](#6-api-endpoints)
7. [Catálogo de Acciones](#7-catálogo-de-acciones)
8. [Variables de Entorno](#8-variables-de-entorno)
9. [Integración con otros Microservicios](#9-integración-con-otros-microservicios)
10. [Consultas Útiles de Auditoría](#10-consultas-útiles-de-auditoría)
11. [Cómo Ejecutar](#11-cómo-ejecutar)

---

## 1. Responsabilidades

| Función | Descripción |
|---------|-------------|
| Registro de cambios | Persiste cada modificación de datos de empleados enviada por employee-service |
| Registro de acciones | Persiste eventos del sistema: login, logout, vacaciones, contratos, reportes |
| Trazabilidad completa | Incluye `ip_origen` y `user_agent` en todos los registros relevantes |
| Consulta de auditoría | Expone endpoints de consulta filtrada para ADMIN y HR |
| Aislamiento | Opera de forma independiente — un fallo aquí no afecta a los demás servicios |
| Solo recibe | Es un servicio **pasivo**: no llama a ningún otro microservicio |

---

## 2. Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 18 + TypeScript 5 |
| Framework | Express.js v5 |
| Base de datos | PostgreSQL 14+ con `pg` (sin ORM) |
| Migraciones | node-pg-migrate (TypeScript) |
| Auth | JWT — solo en endpoints de consulta |
| Contenedor | Docker |

---

## 3. Estructura de Carpetas

```
history-service/
├── migrations/
│   ├── 001_create_historial_cambios.ts
│   └── 002_create_acciones_sistema.ts
├── src/
│   ├── config/
│   │   ├── database.ts          # Pool de conexiones pg + healthcheck
│   │   └── env.ts               # Variables de entorno validadas
│   ├── controllers/
│   │   └── history.controller.ts
│   ├── entities/
│   │   ├── historial-cambio.entity.ts
│   │   └── accion-sistema.entity.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts             # verifyToken (para endpoints de consulta)
│   │   ├── authorize.middleware.ts        # requireRol
│   │   ├── internal-auth.middleware.ts    # verifyInternalApiKey + allowInternalApiKeyOrJwtRoles
│   │   ├── error-handler.middleware.ts    # Manejo centralizado de errores
│   │   └── not-found.middleware.ts        # Ruta 404
│   ├── repositories/
│   │   ├── historialCambios.repository.ts
│   │   └── accionesSistema.repository.ts
│   ├── routes/
│   │   ├── history.routes.ts
│   │   └── health.routes.ts
│   ├── services/
│   │   └── history.service.ts
│   ├── shared/
│   │   ├── enums/
│   │   │   └── role.enum.ts
│   │   └── errors/
│   │       ├── app-error.ts
│   │       ├── unauthorized.error.ts
│   │       └── forbidden.error.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

---

## 4. Modelo de Datos

### Tabla `historial_cambios`

Registra cada campo modificado en los datos de un empleado.

```sql
CREATE TABLE historial_cambios (
  id                   BIGSERIAL PRIMARY KEY,
  empleado_id          BIGINT NOT NULL,
  entidad              VARCHAR(50) NOT NULL,      -- 'empleado', 'cargo_salario', 'documento'
  entidad_id           INT,
  campo_modificado     VARCHAR(100) NOT NULL,
  valor_anterior       TEXT,
  valor_nuevo          TEXT,
  usuario_modificador  VARCHAR(150) NOT NULL,
  rol_modificador      VARCHAR(50),
  ip_origen            VARCHAR(45),               -- siempre requerido
  user_agent           TEXT,                      -- siempre requerido
  fecha_modificacion   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historial_empleado_fecha ON historial_cambios(empleado_id, fecha_modificacion DESC);
CREATE INDEX idx_historial_entidad        ON historial_cambios(entidad, entidad_id);
CREATE INDEX idx_historial_usuario        ON historial_cambios(usuario_modificador);
```

### Tabla `acciones_sistema`

Registra eventos de negocio: logins, logouts, vacaciones, contratos, reportes, demos.

```sql
CREATE TABLE acciones_sistema (
  id            BIGSERIAL PRIMARY KEY,
  usuario_email VARCHAR(150),
  rol           VARCHAR(50),
  accion        VARCHAR(100) NOT NULL,     -- ver catálogo de acciones
  entidad       VARCHAR(50),
  entidad_id    INT,
  resultado     VARCHAR(20) DEFAULT 'exitoso'
                CHECK (resultado IN ('exitoso','fallido','denegado')),
  detalle       TEXT,
  ip_origen     VARCHAR(45),               -- siempre requerido
  user_agent    TEXT,                      -- siempre requerido
  fecha         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_acciones_usuario ON acciones_sistema(usuario_email, fecha DESC);
CREATE INDEX idx_acciones_tipo    ON acciones_sistema(accion, resultado);
```

---

## 5. Migraciones

```bash
npm run migrate        # Aplica migraciones pendientes
npm run migrate:down   # Revierte la última migración
```

Orden de ejecución:

```
001_create_historial_cambios.ts  → tabla de cambios de empleados
002_create_acciones_sistema.ts   → tabla de acciones del sistema
```

---

## 6. API Endpoints

Base path: `/api/historial`

### Escritura — sin JWT, protegidos por `x-internal-key`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/cambios` | Registrar un cambio de campo en datos de empleado |
| POST | `/acciones` | Registrar una acción del sistema |

**Body `POST /cambios`:**
```json
{
  "empleado_id": 1,
  "entidad": "empleado",
  "entidad_id": 1,
  "campo_modificado": "estado",
  "valor_anterior": "activo",
  "valor_nuevo": "inactivo",
  "usuario_modificador": "admin@empresa.com",
  "rol_modificador": "ADMIN",
  "ip_origen": "192.168.1.10",
  "user_agent": "Mozilla/5.0 ..."
}
```

**Body `POST /acciones`:**
```json
{
  "usuario_email": "admin@empresa.com",
  "rol": "ADMIN",
  "accion": "login",
  "resultado": "exitoso",
  "ip_origen": "192.168.1.10",
  "user_agent": "Mozilla/5.0 ..."
}
```

### Consulta — requieren JWT (ADMIN / HR) O x-internal-key

**Nota:** Estos endpoints aceptan AMBOS métodos de autenticación:
- **JWT válido** con rol autorizado (ADMIN/HR según el endpoint)
- **Header `x-internal-key`** con clave interna válida (acceso completo)

| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | `/cambios/empleado/:id` | ADMIN, HR | Cambios de un empleado específico |
| GET | `/cambios` | ADMIN | Listado general de cambios con filtros |
| GET | `/acciones` | ADMIN | Todas las acciones del sistema con filtros |

**Query params para `/cambios/empleado/:id`:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `entidad` | string | Filtrar por entidad (`empleado`, `cargo_salario`, `documento`) |
| `entidad_id` | number | Filtrar por ID de entidad |
| `desde` | `YYYY-MM-DD` | Fecha inicial (inclusive) |
| `hasta` | `YYYY-MM-DD` | Fecha final (inclusive) |
| `page` | number | Número de página (default: 1) |
| `limit` | number | Registros por página (default: 50, máx: 100) |

**Query params para `/acciones`:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `accion` | string | Filtrar por código de acción (ver catálogo) |
| `resultado` | string | `exitoso`, `fallido`, `denegado` |
| `usuario_email` | string | Filtrar por actor |
| `desde` | `YYYY-MM-DD` | Fecha inicial (inclusive) |
| `hasta` | `YYYY-MM-DD` | Fecha final (inclusive) |
| `page` | number | Número de página (default: 1) |
| `limit` | number | Registros por página (default: 50, máx: 100) |

### Salud

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Estado del servicio y BD |

---

## 6B. Funcionalidades Implementadas (No documentadas en secciones previas)

### Autenticación Dual en Endpoints de Consulta

Los endpoints `GET /cambios*` y `GET /acciones` implementan `allowInternalApiKeyOrJwtRoles()` que permite:
- Acceso con **x-internal-key** (obtiene acceso sin restricción de rol)
- Acceso con **JWT** válido (verifica rol antes de permitir)

Esto permite que servicios internos usen la clave interna para auditoría, y que la UI use JWT.

### Health Check con Validación de BD

`GET /health` devuelve:
- `status`: `ok` (todo bien) o `degraded` (BD desconectada)
- `database`: `connected` o `disconnected`
- `timestamp`: fecha/hora del check

**Propósito:** Kubernetes liveness/readiness probes pueden usar esto para detectar cuando el servicio está listo.

### Manejo Centralizado de Errores

`error-handler.middleware.ts` convierte errores en respuestas JSON consistentes:
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Token requerido" }
}
```

### Middleware de Ruta No Encontrada

`not-found.middleware.ts` responde con 404 a rutas no definidas.

### CORS Configurado

`app.ts` configura CORS desde variable `CORS_ORIGINS`. Permite credenciales.

---

## 7. Catálogo de Acciones

Todos los valores válidos para el campo `accion` en `acciones_sistema` y para `campoModificado` en contexto de `tipo_accion`:

| Acción | Disparado por | Tabla destino |
|--------|--------------|---------------|
| `login` | Auth Service | `acciones_sistema` |
| `logout` | Auth Service | `acciones_sistema` |
| `logout_all` | Auth Service | `acciones_sistema` |
| `token_renovado` | Auth Service | `acciones_sistema` |
| `creacion_empleado` | Employee Service | `historial_cambios` |
| `modificacion_empleado` | Employee Service | `historial_cambios` |
| `eliminacion_empleado` | Employee Service | `historial_cambios` |
| `cambio_cargo_salario` | Employee Service | `historial_cambios` |
| `subida_documento` | Employee Service | `historial_cambios` |
| `aprobacion_documento` | Employee Service | `historial_cambios` |
| `solicitud_correccion` | Employee Service | `historial_cambios` |
| `creacion_contrato` | Contract Service | `historial_cambios` |
| `adenda_contrato` | Contract Service | `historial_cambios` |
| `renovacion_contrato` | Contract Service | `historial_cambios` |
| `terminacion_contrato` | Contract Service | `historial_cambios` |
| `vencimiento_automatico_contrato` | Contract Service (job) | `historial_cambios` |
| `solicitud_vacaciones` | Vacation Service | `acciones_sistema` |
| `aprobacion_vacaciones` | Vacation Service | `acciones_sistema` |
| `rechazo_vacaciones` | Vacation Service | `acciones_sistema` |
| `reporte_generado` | Report Service | `acciones_sistema` |
| `registro_empresa` | Super Admin Service | `acciones_sistema` |
| `activacion_empresa` | Super Admin Service | `acciones_sistema` |
| `aprobacion_demo` | Super Admin Service | `acciones_sistema` |

---

## 8. Variables de Entorno

```env
# Aplicación
NODE_ENV=development
PORT=3006
SERVICE_NAME=history-service

# Base de datos
DATABASE_URL=postgresql://postgres:password@localhost:5432/history_db

# JWT (mismo secreto compartido con auth-service — solo para endpoints de consulta)
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234

# Protección de endpoints de escritura interna
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion

# CORS
CORS_ORIGINS=http://localhost:5173
```

---

## 9. Integración con otros Microservicios

### Este servicio recibe de (escritura interna)

Todos envían el header `x-internal-key: <INTERNAL_API_KEY>` en sus llamadas. El History Service **nunca llama a ningún otro servicio**.

```
Auth Service     ─── POST /api/historial/acciones  (login, logout, logout_all, token_renovado)
Employee Service ─── POST /api/historial/cambios   (creacion_empleado, cambio_cargo_salario, etc.)
Contract Service ─── POST /api/historial/cambios   (creacion_contrato, adenda, renovacion, etc.)
Vacation Service ─── POST /api/historial/acciones  (solicitud_vacaciones, aprobacion, rechazo)
Report Service   ─── POST /api/historial/acciones  (reporte_generado)
Super Admin Svc  ─── POST /api/historial/acciones  (registro_empresa, aprobacion_demo, etc.)
```

### Este servicio es consultado por

```
Employee Service   (GET /cambios/empleado/:id — dentro del panel de detalle del empleado)
Super Admin Svc    (GET /acciones — auditoría global)
Frontend Admin     (GET /cambios, GET /acciones — log de auditoría)
```

### Flujo típico (fire-and-forget)

```typescript
// En cualquier microservicio — nunca bloquea
historyClient.registrarCambio({
  empleado_id:          datos.id,
  entidad:              'empleado',
  campo_modificado:     'estado',
  valor_anterior:       'activo',
  valor_nuevo:          'inactivo',
  usuario_modificador:  req.usuario.email,
  rol_modificador:      req.usuario.role,
  ip_origen:            req.ip,
  user_agent:           req.headers['user-agent'],
}).catch(err => console.warn('[HistoryClient] No se pudo registrar cambio:', err.message));
```

---

## 10. Consultas Útiles de Auditoría

```sql
-- ¿Quién modificó el salario de un empleado y cuándo?
SELECT usuario_modificador, rol_modificador, valor_anterior, valor_nuevo,
       ip_origen, user_agent, fecha_modificacion
FROM historial_cambios
WHERE empleado_id = $1 AND campo_modificado = 'salario'
ORDER BY fecha_modificacion DESC;

-- Intentos de login fallidos en las últimas 24 horas
SELECT usuario_email, ip_origen, user_agent,
       COUNT(*) AS intentos, MAX(fecha) AS ultimo_intento
FROM acciones_sistema
WHERE accion = 'login' AND resultado = 'fallido'
  AND fecha >= NOW() - INTERVAL '24 hours'
GROUP BY usuario_email, ip_origen, user_agent
ORDER BY intentos DESC;

-- Todos los logout y logout-all del último mes
SELECT usuario_email, accion, ip_origen, fecha
FROM acciones_sistema
WHERE accion IN ('logout', 'logout_all')
  AND fecha >= NOW() - INTERVAL '30 days'
ORDER BY fecha DESC;

-- Actividad completa de un usuario en el último mes
SELECT accion, resultado, ip_origen, fecha
FROM acciones_sistema
WHERE usuario_email = $1
  AND fecha >= NOW() - INTERVAL '30 days'
ORDER BY fecha DESC;

-- Resumen de actividad del sistema por tipo de acción (último mes)
SELECT accion, resultado, COUNT(*) AS total
FROM acciones_sistema
WHERE fecha >= NOW() - INTERVAL '30 days'
GROUP BY accion, resultado
ORDER BY total DESC;

-- Cambios en los documentos de un empleado
SELECT campo_modificado, valor_anterior, valor_nuevo,
       usuario_modificador, fecha_modificacion
FROM historial_cambios
WHERE empleado_id = $1 AND entidad = 'documento'
ORDER BY fecha_modificacion DESC;

-- Historial completo de cargos y salarios (con auditoría)
SELECT campo_modificado, valor_anterior, valor_nuevo,
       usuario_modificador, rol_modificador, fecha_modificacion
FROM historial_cambios
WHERE empleado_id = $1
  AND campo_modificado IN ('cargo', 'salario', 'cambio_cargo_salario')
ORDER BY fecha_modificacion DESC;
```

---

## 11. Cómo Ejecutar

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ con base de datos `history_db` creada

```bash
psql -U postgres -c "CREATE DATABASE history_db;"
```

> Este servicio **no depende de que otros microservicios estén corriendo**. Puede iniciarse de forma independiente.

### Desarrollo local

```bash
npm install
cp .env.example .env
# Editar .env con DATABASE_URL, JWT_SECRET e INTERNAL_API_KEY

npm run migrate
npm run dev
# → http://localhost:3006
```

### Verificar que funciona

```bash
curl http://localhost:3006/health
```

```json
{
  "service": "history-service",
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-05-13T15:30:00.000Z"
}
```

El status puede ser `ok` (BD conectada) o `degraded` (BD desconectada).

### Probar escritura interna

```bash
curl -X POST http://localhost:3006/api/historial/acciones \
  -H "Content-Type: application/json" \
  -H "x-internal-key: clave_interna_muy_segura_cambiar_en_produccion" \
  -d '{"usuario_email":"test@empresa.com","accion":"login","resultado":"exitoso","ip_origen":"127.0.0.1","user_agent":"curl/7.64.1"}'
```

### Producción

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t history-service .
docker run -p 3006:3006 --env-file .env history-service
```