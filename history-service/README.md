# History Service — Microservicio de Auditoría e Historial

> Microservicio 3 de 5 · Puerto 3006 · Base de datos: `history_db`

Registro centralizado de auditoría: captura cambios de datos de empleados y acciones del sistema enviados por otros microservicios vía fire-and-forget. Los endpoints de escritura no requieren JWT para no bloquear el flujo principal del llamador.

---

## Tabla de Contenido

1. [Responsabilidades](#responsabilidades)
2. [Tech Stack](#tech-stack)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Modelo de Datos](#modelo-de-datos)
5. [Migraciones](#migraciones)
6. [API Endpoints](#api-endpoints)
7. [Variables de Entorno](#variables-de-entorno)
8. [Integración con otros Microservicios](#integración-con-otros-microservicios)
9. [Cómo Ejecutar](#cómo-ejecutar)

---

## Responsabilidades

| Función | Descripción |
|---------|-------------|
| Registro de cambios | Persiste cada modificación de datos de empleados enviada por employee-service |
| Registro de acciones | Persiste eventos del sistema (login, logout, operaciones críticas) |
| Consulta de auditoría | Expone endpoints de consulta filtrada para ADMIN y HR |
| Aislamiento | Opera de forma independiente — un fallo aquí no afecta a los demás servicios |

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js v5 |
| Base de Datos | PostgreSQL |
| Migraciones | node-pg-migrate |
| Auth | JWT (solo en endpoints de consulta) |

---

## Estructura de Carpetas

```
history-service/
├── migrations/
│   ├── 001_create_historial_cambios.ts
│   └── 002_create_acciones_sistema.ts
├── src/
│   ├── config/
│   │   ├── database.ts          # Pool de conexiones PostgreSQL
│   │   └── env.ts               # Variables de entorno validadas
│   ├── controllers/
│   │   └── history.controller.ts
│   ├── entities/
│   │   ├── historial-cambio.entity.ts
│   │   └── accion-sistema.entity.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts         # verifyToken
│   │   └── authorize.middleware.ts    # requireRol
│   ├── repositories/
│   │   ├── historialCambios.repository.ts
│   │   └── accionesSistema.repository.ts
│   ├── routes/
│   │   └── history.routes.ts
│   ├── services/
│   │   └── history.service.ts
│   ├── shared/
│   │   └── enums/role.enum.ts
│   ├── app.ts
│   └── server.ts
├── .vscode/
│   └── settings.json          # TypeScript SDK local (evita deprecation warnings)
├── tsconfig.json               # Desarrollo / IDE
├── tsconfig.build.json         # Compilación de producción
└── package.json
```

---

## Modelo de Datos

### Tabla `historial_cambios`

Registra cada campo modificado en los datos de un empleado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGSERIAL PK | |
| `empleado_id` | BIGINT | ID del empleado afectado |
| `entidad` | VARCHAR(50) | Tabla/entidad modificada (`empleado`, `cargo_salario`) |
| `entidad_id` | INT | ID del registro modificado (nullable) |
| `campo_modificado` | VARCHAR(100) | Nombre del campo que cambió |
| `valor_anterior` | TEXT | Valor antes del cambio (nullable) |
| `valor_nuevo` | TEXT | Valor después del cambio (nullable) |
| `usuario_modificador` | VARCHAR(150) | Email del usuario que realizó el cambio |
| `rol_modificador` | VARCHAR(50) | Rol del usuario (nullable) |
| `ip_origen` | VARCHAR(45) | IP de la petición (nullable) |
| `fecha_modificacion` | TIMESTAMP | Marca de tiempo automática |

**Índices:** `(empleado_id, fecha_modificacion DESC)`, `(entidad, entidad_id)`, `(usuario_modificador)`

---

### Tabla `acciones_sistema`

Registra eventos de negocio: logins, logouts, operaciones críticas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGSERIAL PK | |
| `usuario_email` | VARCHAR(150) | Email del actor (nullable para acciones anónimas) |
| `rol` | VARCHAR(50) | Rol del actor (nullable) |
| `accion` | VARCHAR(100) | Código de la acción (`LOGIN`, `LOGOUT`, `CREAR_EMPLEADO`, etc.) |
| `entidad` | VARCHAR(50) | Entidad afectada (nullable) |
| `entidad_id` | INT | ID de la entidad (nullable) |
| `resultado` | VARCHAR(20) | `exitoso`, `fallido`, `denegado` (default: `exitoso`) |
| `detalle` | TEXT | Información adicional (nullable) |
| `ip_origen` | VARCHAR(45) | IP de la petición (nullable) |
| `user_agent` | TEXT | Navegador/cliente (nullable) |
| `fecha` | TIMESTAMP | Marca de tiempo automática |

**Índices:** `(usuario_email, fecha DESC)`, `(accion, resultado)`

---

## Migraciones

```bash
# Aplicar todas las migraciones pendientes
npm run migrate

# Revertir la última migración
npm run migrate:down
```

Orden de ejecución:
1. `001_create_historial_cambios.ts` — tabla de cambios de empleados
2. `002_create_acciones_sistema.ts` — tabla de acciones del sistema

---

## API Endpoints

### Escritura — sin autenticación (llamadas internas fire-and-forget)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/historial/cambios` | Registrar un cambio de datos de empleado |
| `POST` | `/api/historial/acciones` | Registrar una acción del sistema |

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
  "ip_origen": "192.168.1.10"
}
```

**Body `POST /acciones`:**
```json
{
  "usuario_email": "admin@empresa.com",
  "rol": "ADMIN",
  "accion": "LOGIN",
  "resultado": "exitoso",
  "ip_origen": "192.168.1.10",
  "user_agent": "Mozilla/5.0 ..."
}
```

---

### Consulta — requiere JWT (solo ADMIN / HR)

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/api/historial/cambios/empleado/:id` | ADMIN, HR | Cambios de un empleado específico |
| `GET` | `/api/historial/acciones` | ADMIN | Todas las acciones del sistema |

**Query params disponibles para `/cambios/empleado/:id`:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `entidad` | string | Filtrar por entidad (`empleado`, `cargo_salario`) |
| `entidad_id` | number | Filtrar por ID de entidad |
| `desde` | date | Fecha de inicio (`YYYY-MM-DD`) |
| `hasta` | date | Fecha de fin (`YYYY-MM-DD`) |
| `limit` | number | Registros por página (default: 50) |
| `offset` | number | Desplazamiento (default: 0) |

**Query params disponibles para `/acciones`:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `accion` | string | Filtrar por código de acción |
| `resultado` | string | `exitoso`, `fallido`, `denegado` |
| `usuario_email` | string | Filtrar por actor |
| `desde` / `hasta` | date | Rango de fechas |
| `limit` / `offset` | number | Paginación |

### Salud

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/health` | No | Estado del servicio |

---

## Variables de Entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | Sí | — | `postgresql://user:pass@host:5432/history_db` |
| `JWT_SECRET` | Sí | — | Mismo secreto compartido con auth-service |
| `INTERNAL_API_KEY` | Producción | `dev-internal-key-...` en desarrollo | Clave compartida para proteger escrituras internas |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Orígenes permitidos separados por coma |
| `PORT` | No | `3006` | Puerto del servidor |
| `NODE_ENV` | No | `development` | `development`, `production`, `test` |

---

## Integración con otros Microservicios

### ← employee-service (Puerto 3002)
Envía `POST /api/historial/cambios` con header `x-internal-key` sin esperar respuesta (fire-and-forget).
Los eventos se generan automáticamente en:
- Crear empleado → `campo_modificado: "empleado_creado"`
- Actualizar empleado → un registro por cada campo que cambió
- Soft delete → `campo_modificado: "estado"`, valor nuevo: `"inactivo"`
- Crear cargo/salario → `campo_modificado: "cargo_salario_creado"`

### ← auth-service (Puerto 3001)
Puede enviar `POST /api/historial/acciones` con header `x-internal-key` para registrar eventos de autenticación (LOGIN, LOGOUT, REFRESH, etc.).

### JWT compartido
Los endpoints de consulta (`GET`) validan el token localmente con `JWT_SECRET` — no hay llamada HTTP a auth-service.

```
employee-service ──POST /cambios + x-internal-key──► history-service (escritura interna, sin JWT)
auth-service     ──POST /acciones + x-internal-key─► history-service (escritura interna, sin JWT)

cliente          ──GET /cambios/empleado/:id──► history-service (lectura, con JWT)
```

---

## Cómo Ejecutar

### Requisitos previos
- Node.js >= 18
- PostgreSQL >= 14 corriendo con base de datos `history_db` creada

> Este servicio **no depende** de que otros microservicios estén corriendo.

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con DATABASE_URL y JWT_SECRET

# 3. Aplicar migraciones
npm run migrate

# 4. Iniciar en modo desarrollo
npm run dev
# → Servidor en http://localhost:3006
```

### Producción

```bash
npm run build
npm start
```
