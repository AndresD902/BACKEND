# 📋 Wiki — Sistema Administrador de Empleados

> Documentación completa del proyecto final · Versión 1.0 — Modelo de datos profesional

---

## Tabla de Contenido

1. [Contexto del Problema](#1-contexto-del-problema)
2. [Usuario Final](#2-usuario-final)
3. [Caso de Uso Principal](#3-caso-de-uso-principal)
4. [Alcance del Proyecto](#4-alcance-del-proyecto)
5. [Riesgos y Mitigaciones](#5-riesgos-y-mitigaciones)
6. [Arquitectura del Sistema](#6-arquitectura-del-sistema)
   - [6.1 Documentación Interna de cada Microservicio](#61-documentación-interna-de-cada-microservicio)
7. [Modelo de Datos Completo — por Microservicio](#7-modelo-de-datos-completo--por-microservicio)
8. [Migraciones de Base de Datos](#8-migraciones-de-base-de-datos)
9. [Almacenamiento de Archivos — AWS S3](#9-almacenamiento-de-archivos--aws-s3)
10. [Diseño de Pantallas](#10-diseño-de-pantallas)
11. [API REST Documentada](#11-api-rest-documentada)
12. [Casos de Prueba y Evidencias](#12-casos-de-prueba-y-evidencias)
13. [Pruebas de Performance con Grafana k6](#13-pruebas-de-performance-con-grafana-k6)
14. [Guía de Ejecución](#14-guía-de-ejecución)
15. [Monetización](#15-monetización)
16. [Estrategia de Visibilidad](#16-estrategia-de-visibilidad)
17. [Estudio de Mercado](#17-estudio-de-mercado)
18. [Roadmap y Mejoras Futuras](#18-roadmap-y-mejoras-futuras)
19. [Diagramas Obligatorios](#19-diagramas-obligatorios)
20. [Estructura de Repositorios](#20-estructura-de-repositorios)
21. [Seguridad](#21-seguridad)

---

## 1. Contexto del Problema

La empresa gestiona la información de sus empleados de manera **descentralizada**, utilizando hojas de cálculo, documentos físicos y registros manuales, generando ineficiencias críticas en el área de Recursos Humanos.

### Problemas Identificados

| Área | Problema |
|------|----------|
| Registro de empleados | Datos inconsistentes, duplicados y desactualizados |
| Contratos laborales | Sin trazabilidad, registros en papel |
| Gestión de vacaciones | Sin validaciones automáticas, sin control de días disponibles |
| Cambios laborales | Sin historial de cargo/salario |
| Control de acceso | Sin separación de roles |
| Sesiones de usuario | Sin control real de logout ni expiración de sesión |
| Reportes | Información dispersa, no confiable |

### Solución Propuesta

Sistema web centralizado basado en **arquitectura de microservicios**, con modelo de datos robusto diseñado para uso empresarial real, control estricto por roles, trazabilidad completa, gestión de sesiones segura y cálculo automático de vacaciones disponibles.

---

## 2. Usuario Final

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Administrador** | Acceso total al sistema | CRUD completo en todos los módulos |
| **RRHH** | Gestión operativa de empleados | Registro, edición parcial, aprobación de vacaciones |
| **Consulta** | Solo lectura | Visualización de información y reportes |

---

## 3. Caso de Uso Principal

```
1. [RRHH] Registra nuevo empleado
       ↓
2. [Sistema] Sube foto y CV a AWS S3 via presigned URL
       ↓
3. [RRHH] Asigna contrato laboral
       (Contract Service valida empleado via HTTP REST)
       ↓
4. [Sistema] Crea registro inicial en dias_disponibles para el año actual
       ↓
5. [RRHH] Solicita vacaciones para el empleado
       ↓
6. [Sistema] Valida: días hábiles, anticipación 1 mes, festivos CO, días disponibles
       ↓
7. [Sistema] Envía correo automático a RRHH
       ↓
8. [RRHH] Aprueba o rechaza en 3 días hábiles
       ↓
9. [Sistema] Actualiza dias_disponibles; registra en History Service
       ↓
10. [Admin/RRHH] Genera reporte consolidado
```

### Casos de Uso por Servicio

| # | Servicio | Responsabilidad clave |
|---|----------|-----------------------|
| 1 | **Auth Service** | Hasheo bcrypt + JWT + refresh tokens + logout real |
| 2 | **Employee Service** | Empleados + historial de cargo/salario + archivos en S3 |
| 3 | **Contract Service** | Contratos + adendas + validación REST al Employee Service |
| 4 | **Vacation Service** | Solicitudes + días disponibles por año + festivos en BD + email |
| 5 | **Report Service** | Agrega datos de 3 servicios via REST — sin BD propia |
| 6 | **History Service** | Trazabilidad completa de cambios por entidad, campo y usuario |

---

## 4. Alcance del Proyecto

### ✅ Incluye (MVP)

- Autenticación con JWT + refresh tokens + logout real (revocación de tokens).
- Registro completo de empleados con historial de cargo y salario.
- Almacenamiento de foto y CV en **AWS S3** (presigned URLs).
- Gestión de contratos con adendas y validación REST cruzada.
- Vacaciones con cálculo automático de días disponibles por año.
- Festivos colombianos almacenados en BD (actualizables sin redesplegar).
- Notificación por correo a RRHH en cada solicitud.
- Reportes consolidados sin BD propia.
- Trazabilidad de cambios con auditoría completa.
- Migraciones versionadas automáticas en Docker.
- Análisis de calidad con SonarCloud (cobertura mínima 60%).
- Pruebas E2E e integración con Playwright.
- Pruebas de carga y estrés con Grafana k6.

### ❌ No Incluye en MVP

- Módulo de nómina y liquidaciones.
- App móvil nativa.
- Portal de autoservicio para empleados.
- Firma digital de contratos.

### Supuestos Técnicos

- Los empleados **NO** son usuarios del sistema; son entidades gestionadas por Admin/RRHH.
- Cada microservicio tiene su propia BD independiente; las relaciones entre servicios son **lógicas via REST**.
- Festivos colombianos se cargan como datos semilla (seed) al iniciar por primera vez.
- Los días de vacaciones legales son 15 días hábiles por año (Código Sustantivo del Trabajo Colombia).
- Las migraciones corren automáticamente al iniciar cada contenedor Docker.

---

## 5. Riesgos y Mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | Pérdida de datos en BD | Media | Alto | Backups automáticos diarios en servicio administrado |
| 2 | Token JWT comprometido | Baja | Alto | Refresh tokens + tabla `refresh_tokens` para revocación real |
| 3 | Sesión activa tras logout | Media | Alto | `refresh_tokens.revocado = true` al hacer logout |
| 4 | Inconsistencia en días disponibles | Media | Alto | Tabla `dias_disponibles` como fuente de verdad; actualización transaccional |
| 5 | Festivos hardcodeados desactualizados | Alta | Medio | Tabla `festivos` en BD; seed anual actualizable sin redespliegue |
| 6 | Fallo en comunicación entre microservicios | Media | Alto | Timeouts + reintentos + errores 503 controlados |
| 7 | Archivos S3 expuestos | Media | Alto | Objetos privados + presigned URLs con expiración |
| 8 | Deuda técnica acumulada | Alta | Medio | SonarCloud en cada PR + cobertura mínima 60% |
| 9 | Migración de BD falla en Docker | Media | Alto | `depends_on: condition: service_healthy` + migraciones idempotentes |
| 10 | Despliegue fallido en producción | Media | Alto | CI/CD con GitHub Actions + ambiente de staging |

---

## 6. Arquitectura del Sistema

### Tecnologías por Capa por cada microservicio

| Capa | Tecnología | Justificación |
|------|-----------|--------------|
| **Frontend** | React + Vite + TailwindCSS | SPA moderna, componentes reutilizables |
| **Backend** | Node.js + Express | Liviano, ideal para microservicios REST |
| **Base de Datos** | PostgreSQL | Relacional, ACID, una instancia por servicio |
| **Migraciones** | node-pg-migrate | Versionado de esquema, idempotente en Docker |
| **Seeds** | Scripts SQL / node-pg-migrate | Datos iniciales (festivos, configuración) |
| **Almacenamiento** | AWS S3 | Escalable para binarios (fotos, CVs) |
| **Autenticación** | JWT + Refresh Tokens | Stateless + logout real con revocación |
| **Notificaciones** | Nodemailer + SMTP | Correos automáticos de vacaciones |
| **Contenedores** | Docker + Docker Compose | Portabilidad y consistencia |
| **CI/CD** | GitHub Actions | Automatización de pruebas y despliegue |
| **Calidad** | SonarCloud | Análisis estático, cobertura mínima 60% |
| **Pruebas E2E** | Playwright | Flujos completos e integración de APIs |
| **Performance** | Grafana k6 | Pruebas de carga y estrés |
| **Despliegue** | Render / Railway / Vercel | PaaS con URL pública |

---

## 6.1 Documentación Interna de cada Microservicio

Esta sección detalla la lógica interna, responsabilidades, flujos y estructura de código de cada uno de los 6 microservicios del sistema. Es la guía de referencia antes de comenzar a programar.

---

### Microservicio 1 — Auth Service

**Puerto:** 3001 | **Base de datos:** `auth_db` | **Tablas:** `usuarios`, `refresh_tokens`

#### Responsabilidades
- Registrar usuarios con contraseña hasheada en bcrypt.
- Autenticar usuarios y emitir `access_token` (JWT, 1h) + `refresh_token` (opaco, 7 días).
- Renovar el `access_token` sin pedir contraseña nuevamente, usando el `refresh_token`.
- Revocar tokens en logout (individual y global).
- Proveer middleware `verifyToken` reutilizable por los demás servicios.

#### Flujo de Login
```
POST /api/auth/login
  1. Busca usuario por email en BD
  2. Verifica contraseña con bcrypt.compare()
  3. Genera access_token (JWT firmado con JWT_SECRET, exp: 1h)
  4. Genera refresh_token (crypto.randomBytes(64).toString('hex'))
  5. Guarda hash SHA-256 del refresh_token en tabla refresh_tokens
  6. Actualiza usuarios.ultimo_login
  7. Retorna { access_token, refresh_token, usuario: { id, email, rol } }
```

#### Flujo de Refresh
```
POST /api/auth/refresh
  1. Recibe { refresh_token } en el body
  2. Calcula SHA-256 del token recibido
  3. Busca en refresh_tokens por token_hash
  4. Verifica: ¿existe? ¿revocado = false? ¿expires_at > ahora?
  5. Si todo OK → genera nuevo access_token
  6. Retorna { access_token }
  7. Si falla → 401 "Token inválido o revocado"
```

#### Flujo de Logout
```
POST /api/auth/logout
  1. Recibe { refresh_token } en el body
  2. Calcula SHA-256 del token
  3. Busca en refresh_tokens y marca revocado = TRUE
  4. Retorna 200 { message: "Sesión cerrada correctamente" }

POST /api/auth/logout-all
  1. Extrae usuario_id del access_token (JWT)
  2. Marca revocado = TRUE en TODOS los refresh_tokens del usuario
  3. Útil cuando se sospecha de acceso no autorizado
```

#### Estructura interna
```javascript
// src/services/auth.service.js
const bcrypt    = require('bcrypt');
const crypto    = require('crypto');
const jwt       = require('jsonwebtoken');
const userRepo  = require('../repositories/user.repository');
const tokenRepo = require('../repositories/refreshToken.repository');

const SALT_ROUNDS    = 12;
const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_DAYS   = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7');

const registrar = async ({ cedula, email, password, rol }) => {
  const existe = await userRepo.findByEmail(email);
  if (existe) throw { status: 409, message: 'El email ya está registrado' };
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return userRepo.create({ cedula, email, password: hash, rol });
};

const login = async ({ email, password }, ipOrigen, userAgent) => {
  const usuario = await userRepo.findByEmail(email);
  if (!usuario || !usuario.activo)
    throw { status: 401, message: 'Credenciales inválidas' };
  const valido = await bcrypt.compare(password, usuario.password);
  if (!valido) throw { status: 401, message: 'Credenciales inválidas' };

  const accessToken = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash    = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt    = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await tokenRepo.create({ usuarioId: usuario.id, tokenHash, expiresAt, ipOrigen, userAgent });
  await userRepo.updateUltimoLogin(usuario.id);

  return { access_token: accessToken, refresh_token: refreshToken,
           usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol } };
};

const refresh = async (refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const registro  = await tokenRepo.findByHash(tokenHash);
  if (!registro || registro.revocado || new Date(registro.expires_at) < new Date())
    throw { status: 401, message: 'Token inválido o revocado' };

  const usuario    = await userRepo.findById(registro.usuario_id);
  const accessToken = jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  return { access_token: accessToken };
};

const logout = async (refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await tokenRepo.revocarPorHash(tokenHash);
};

const logoutAll = async (usuarioId) => {
  await tokenRepo.revocarTodosPorUsuario(usuarioId);
};

module.exports = { registrar, login, refresh, logout, logoutAll };
```

```javascript
// src/middlewares/verifyToken.js
// Este middleware se copia en cada microservicio para validar el JWT localmente
const jwt = require('jsonwebtoken');

const verifyToken = (rolesPermitidos = []) => (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // { id, email, rol }
    if (rolesPermitidos.length && !rolesPermitidos.includes(decoded.rol))
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = verifyToken;
```

#### Variables de entorno
```env
PORT=3001
DATABASE_URL=postgres://postgres:password@postgres-auth:5432/auth_db
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7
```

---

### Microservicio 2 — Employee Service

**Puerto:** 3002 | **Base de datos:** `employee_db` | **Tablas:** `empleados`, `cargos_salarios`, `documentos_empleado`

#### Responsabilidades
- Registrar y gestionar el ciclo de vida completo de los empleados.
- Mantener historial de cargos y salarios (promociones, aumentos).
- Gestionar documentos del empleado (foto, CV, certificados) via AWS S3.
- Notificar al History Service cuando se modifican datos sensibles.
- Validar JWT en cada operación mediante middleware local.

#### Flujo: Registrar nuevo empleado
```
POST /api/empleados
  1. Verifica JWT (middleware verifyToken → roles: admin, rrhh)
  2. Valida que la cédula no exista
  3. Crea registro en tabla empleados
  4. Si viene cargo y salario → crea registro en cargos_salarios con activo=TRUE
  5. Notifica a History Service: POST /api/historial/cambios
  6. Retorna empleado creado con 201
```

#### Flujo: Cambiar cargo y salario
```
POST /api/empleados/:id/cargo
  1. Verifica JWT (roles: admin, rrhh)
  2. Busca cargo activo actual → UPDATE activo=FALSE, fecha_fin=hoy
  3. Crea nuevo registro en cargos_salarios con activo=TRUE, fecha_inicio=hoy
  4. Notifica a History Service con campo_modificado='cargo' y 'salario'
  5. Retorna nuevo cargo con 201
```

#### Flujo: Subir documento a S3
```
POST /api/empleados/presigned-url
  1. Verifica JWT (roles: admin, rrhh)
  2. Genera presigned URL de subida con AWS SDK (expira en 5 min)
  3. Retorna { presigned_url, key }

[Frontend sube el archivo directamente a S3]

POST /api/empleados/:id/documentos
  1. Verifica JWT
  2. Si ya existe un documento activo del mismo tipo → UPDATE activo=FALSE
  3. Guarda nuevo registro en documentos_empleado con s3_key, s3_url, activo=TRUE
  4. Retorna documento creado con 201

GET /api/empleados/documentos/:docId/url
  1. Busca el documento en documentos_empleado
  2. Genera presigned URL de descarga (expira en 1h)
  3. Retorna { url, expires_in: 3600 }
```

#### Variables de entorno
```env
PORT=3002
DATABASE_URL=postgres://postgres:password@postgres-employee:5432/employee_db
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui
HISTORY_SERVICE_URL=http://history-service:3006
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=hr-system-empleados
```

---

### Microservicio 3 — Contract Service

**Puerto:** 3003 | **Base de datos:** `contract_db` | **Tablas:** `contratos`, `adendas_contratos`

#### Responsabilidades
- Gestionar contratos laborales de los empleados.
- **Validar via HTTP REST al Employee Service** que el `empleado_id` existe antes de guardar cualquier contrato.
- Registrar adendas (modificaciones al contrato) sin alterar el registro original.
- Mantener el estado del contrato actualizado (activo, vencido, terminado).
- Notificar al History Service cuando se crean o modifican contratos.

#### Flujo: Crear contrato
```
POST /api/contratos
  1. Verifica JWT (roles: admin, rrhh)
  2. Valida campos requeridos (empleado_id, tipo, salario, fecha_inicio)
  3. → HTTP GET http://employee-service:3002/api/empleados/:empleado_id
       - Si responde 200: el empleado existe, continúa
       - Si responde 404: retorna 404 "El empleado no existe en el sistema"
       - Si falla conexión: retorna 503 "Employee Service no disponible"
  4. Verifica que el empleado no tenga ya un contrato activo (opcional: una empresa
     puede tener política de un solo contrato activo por empleado)
  5. Crea registro en tabla contratos
  6. Notifica a History Service: entidad='contrato', accion='creado'
  7. Retorna contrato creado con 201
```

#### Flujo: Agregar adenda
```
POST /api/contratos/:id/adendas
  1. Verifica JWT (roles: admin, rrhh)
  2. Verifica que el contrato existe y está activo
  3. Calcula numero_adenda = (COUNT de adendas existentes del contrato) + 1
  4. Construye cambios_json comparando valores anteriores vs nuevos
     Ejemplo: { "modalidad": { "antes": "presencial", "despues": "hibrido" } }
  5. Crea registro en adendas_contratos
  6. Si la adenda modifica campos del contrato (salario, fecha_fin, etc.)
     → actualiza también el registro en contratos
  7. Notifica a History Service
  8. Retorna adenda creada con 201
```

#### Estructura interna — cliente REST al Employee Service
```javascript
// contract-service/src/clients/employeeServiceClient.js
const axios = require('axios');

const EMPLOYEE_URL = process.env.EMPLOYEE_SERVICE_URL;
const TIMEOUT_MS   = 5000; // 5 segundos máximo de espera

const verificarEmpleado = async (empleadoId, token) => {
  try {
    const response = await axios.get(`${EMPLOYEE_URL}/api/empleados/${empleadoId}`, {
      headers:  { Authorization: `Bearer ${token}` },
      timeout:  TIMEOUT_MS
    });
    return response.data; // retorna el empleado si existe
  } catch (error) {
    if (error.response?.status === 404)
      throw { status: 404, message: `El empleado con id ${empleadoId} no existe en el sistema` };
    // Cualquier otro error (timeout, conexión rechazada, etc.) → 503
    throw { status: 503, message: 'No se pudo verificar el empleado. Intente nuevamente.' };
  }
};

module.exports = { verificarEmpleado };
```

```javascript
// contract-service/src/services/contract.service.js
const contratoRepo = require('../repositories/contract.repository');
const adendaRepo   = require('../repositories/adenda.repository');
const employeeClient = require('../clients/employeeServiceClient');
const historyClient  = require('../clients/historyServiceClient');

const crearContrato = async (datos, token, usuarioEmail) => {
  // Validación cruzada via REST
  await employeeClient.verificarEmpleado(datos.empleado_id, token);

  const contrato = await contratoRepo.create({ ...datos, creadoPor: usuarioEmail });

  // Notificar al History Service (fire-and-forget: no bloqueamos si falla)
  historyClient.registrarCambio({
    empleado_id:         datos.empleado_id,
    entidad:             'contrato',
    entidad_id:          contrato.id,
    campo_modificado:    'contrato_creado',
    valor_nuevo:         JSON.stringify({ tipo: datos.tipo, salario: datos.salario }),
    usuario_modificador: usuarioEmail
  }).catch(err => console.error('History Service no disponible:', err.message));

  return contrato;
};

const agregarAdenda = async (contratoId, datos, token, usuarioEmail) => {
  const contrato = await contratoRepo.findById(contratoId);
  if (!contrato) throw { status: 404, message: 'Contrato no encontrado' };
  if (contrato.estado !== 'activo') throw { status: 400, message: 'Solo se pueden adendas a contratos activos' };

  const count         = await adendaRepo.countByContrato(contratoId);
  const numeroAdenda  = count + 1;
  const adenda        = await adendaRepo.create({
    contratoId, numeroAdenda, creadoPor: usuarioEmail, ...datos
  });

  historyClient.registrarCambio({
    empleado_id:         contrato.empleado_id,
    entidad:             'contrato',
    entidad_id:          contratoId,
    campo_modificado:    `adenda_${numeroAdenda}`,
    valor_nuevo:         datos.descripcion,
    usuario_modificador: usuarioEmail
  }).catch(err => console.error('History Service no disponible:', err.message));

  return adenda;
};

module.exports = { crearContrato, agregarAdenda };
```

#### Variables de entorno
```env
PORT=3003
DATABASE_URL=postgres://postgres:password@postgres-contract:5432/contract_db
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
```

---

### Microservicio 4 — Vacation Service

**Puerto:** 3004 | **Base de datos:** `vacation_db` | **Tablas:** `vacaciones`, `dias_disponibles`, `festivos`

#### Responsabilidades
- Gestionar solicitudes de vacaciones con validaciones estrictas de negocio.
- Calcular días hábiles excluyendo fines de semana y festivos de la tabla `festivos`.
- Mantener actualizada la tabla `dias_disponibles` por empleado por año.
- Enviar notificaciones por correo a RRHH al crear una solicitud.
- Enviar confirmación por correo cuando se aprueba o rechaza.
- Crear automáticamente el registro de `dias_disponibles` para el año actual cuando se solicita por primera vez.

#### Reglas de Negocio (todas validadas en `businessRules.service.js`)
```
1. La fecha_inicio debe ser al menos 1 mes después de la fecha de solicitud.
2. Los días hábiles (excluyendo fines de semana y festivos) deben ser >= 5.
3. El empleado debe tener suficientes días disponibles en dias_disponibles.
4. No pueden solaparse con otra solicitud pendiente o aprobada del mismo empleado.
5. La fecha_inicio no puede ser sábado, domingo, ni festivo.
```

#### Flujo: Solicitar vacaciones
```
POST /api/vacaciones
  1. Verifica JWT (roles: admin, rrhh)
  2. Calcula dias_habiles entre fecha_inicio y fecha_fin usando festivos de la BD
  3. Valida regla 1: fecha_inicio >= hoy + 1 mes
  4. Valida regla 2: dias_habiles >= 5
  5. Obtiene o crea registro en dias_disponibles para (empleado_id, año actual)
  6. Valida regla 3: dias_disponibles >= dias_habiles
  7. Valida regla 4: no solapamiento con otras solicitudes activas
  8. Crea registro en vacaciones con estado='pendiente'
  9. UPDATE dias_disponibles: dias_pendientes += dias_habiles
  10. Envía correo a RRHH con detalles de la solicitud (Nodemailer)
  11. UPDATE vacaciones: notificado=TRUE
  12. Retorna solicitud con 201
```

#### Flujo: Aprobar vacaciones
```
PATCH /api/vacaciones/:id/aprobar
  1. Verifica JWT (roles: admin, rrhh)
  2. Verifica que la solicitud exista y esté en estado 'pendiente'
  3. UPDATE vacaciones: estado='aprobada', aprobado_por, fecha_aprobacion
  4. UPDATE dias_disponibles:
       dias_usados     += dias_habiles
       dias_pendientes -= dias_habiles
  5. Notifica a History Service
  6. Envía correo de confirmación al RRHH/solicitante
  7. Retorna solicitud actualizada con 200
```

#### Flujo: Rechazar vacaciones
```
PATCH /api/vacaciones/:id/rechazar
  1. Verifica JWT (roles: admin, rrhh)
  2. Verifica que la solicitud esté en 'pendiente'
  3. UPDATE vacaciones: estado='rechazada', motivo_rechazo, aprobado_por
  4. UPDATE dias_disponibles: dias_pendientes -= dias_habiles
     (los días vuelven a estar disponibles)
  5. Notifica a History Service
  6. Envía correo de rechazo con motivo
  7. Retorna solicitud actualizada con 200
```

#### Lógica de cálculo de días hábiles
```javascript
// vacation-service/src/services/businessRules.service.js
const festivosRepo = require('../repositories/festivos.repository');

const calcularDiasHabiles = async (fechaInicio, fechaFin) => {
  const festivos = await festivosRepo.obtenerPorRango(fechaInicio, fechaFin);
  const fechasFestivos = new Set(festivos.map(f => f.fecha.toISOString().split('T')[0]));

  let diasHabiles = 0;
  const cursor = new Date(fechaInicio);
  while (cursor <= fechaFin) {
    const diaSemana   = cursor.getDay(); // 0=domingo, 6=sábado
    const fechaStr    = cursor.toISOString().split('T')[0];
    const esFestivo   = fechasFestivos.has(fechaStr);
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    if (!esFestivo && !esFinSemana) diasHabiles++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return diasHabiles;
};

const validarAnticipacion = (fechaInicio) => {
  const hoy        = new Date();
  const unMes      = new Date(hoy);
  unMes.setMonth(unMes.getMonth() + 1);
  if (fechaInicio < unMes)
    throw { status: 400, message: 'La solicitud debe realizarse con al menos 1 mes de anticipación' };
};

const validarDiasMinimos = (diasHabiles) => {
  if (diasHabiles < 5)
    throw { status: 400, message: 'Las vacaciones deben ser de mínimo 5 días hábiles' };
};

const validarDisponibilidad = (diasHabiles, disponibles) => {
  if (diasHabiles > disponibles)
    throw { status: 400,
            message: `El empleado solo tiene ${disponibles} días disponibles y solicitó ${diasHabiles}` };
};

module.exports = { calcularDiasHabiles, validarAnticipacion, validarDiasMinimos, validarDisponibilidad };
```

#### Configuración de correo (Nodemailer)
```javascript
// vacation-service/src/services/email.service.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const notificarSolicitudRRHH = async ({ empleadoNombre, fechaInicio, fechaFin, diasHabiles, emailRRHH }) => {
  await transporter.sendMail({
    from:    `"Sistema RRHH" <${process.env.SMTP_USER}>`,
    to:      emailRRHH,
    subject: `Nueva solicitud de vacaciones — ${empleadoNombre}`,
    html: `
      <h2>Nueva solicitud de vacaciones</h2>
      <p><strong>Empleado:</strong> ${empleadoNombre}</p>
      <p><strong>Período:</strong> ${fechaInicio} al ${fechaFin}</p>
      <p><strong>Días hábiles:</strong> ${diasHabiles}</p>
      <p>Tiene <strong>3 días hábiles</strong> para aprobar o rechazar esta solicitud.</p>
      <a href="${process.env.FRONTEND_URL}/vacaciones">Ver solicitud en el sistema</a>
    `
  });
};

module.exports = { notificarSolicitudRRHH };
```

#### Variables de entorno
```env
PORT=3004
DATABASE_URL=postgres://postgres:password@postgres-vacation:5432/vacation_db
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rrhh@empresa.com
SMTP_PASS=app_password_gmail
FRONTEND_URL=https://hr-system.vercel.app
DIAS_LEGALES_ANUALES=15
```

---

### Microservicio 5 — Report Service

**Puerto:** 3005 | **Base de datos:** Ninguna | **Patrón:** Aggregator

#### Responsabilidades
- Generar reportes consolidados combinando datos de Employee, Contract y Vacation Services.
- **No tiene base de datos propia.** Toda la información se obtiene en tiempo real via HTTP REST.
- Estructurar y formatear los datos para que el frontend los consuma directamente.
- Garantizar que si uno de los servicios dependientes falla, el reporte parcial igual se retorne con advertencia.

#### ¿Por qué sin base de datos?
Si el Report Service tuviera su propia BD, tendría que sincronizarla constantemente con los demás servicios, creando duplicación de datos y riesgo de inconsistencias. Al agregar en tiempo real via REST, los reportes siempre muestran la información más actualizada, sin lógica de sincronización.

#### Flujo: Reporte de estado laboral
```
GET /api/reportes/estado-laboral
  1. Verifica JWT
  2. GET http://employee-service/api/empleados?estado=activo
     → Lista de empleados activos
  3. Para cada empleado:
     GET http://employee-service/api/empleados/:id/cargo-actual
     → Cargo y salario actual
  4. GET http://vacation-service/api/vacaciones/empleado/:id/disponibles
     → Días de vacaciones disponibles
  5. Combina y retorna lista consolidada
```

#### Flujo: Reporte completo de un empleado
```
GET /api/reportes/empleado/:id
  1. Verifica JWT (roles: admin, rrhh)
  2. En paralelo (Promise.allSettled):
     a. GET /employee-service/api/empleados/:id           → datos del empleado
     b. GET /employee-service/api/empleados/:id/historial-cargo → historial de carrera
     c. GET /contract-service/api/contratos/empleado/:id  → contratos y adendas
     d. GET /vacation-service/api/vacaciones/empleado/:id → vacaciones históricas
     e. GET /vacation-service/api/vacaciones/empleado/:id/disponibles → días disponibles
  3. Consolida todos los datos en un único objeto de respuesta
  4. Si alguna llamada falla, incluye el campo con null y agrega advertencia en la respuesta
```

#### Manejo de fallos parciales
```javascript
// report-service/src/services/report.service.js
const obtenerReporteEmpleado = async (empleadoId, token) => {
  const headers = { Authorization: `Bearer ${token}` };

  const [empleado, historialCargo, contratos, vacaciones, disponibles] =
    await Promise.allSettled([
      axios.get(`${EMPLOYEE_URL}/api/empleados/${empleadoId}`,               { headers }),
      axios.get(`${EMPLOYEE_URL}/api/empleados/${empleadoId}/historial-cargo`, { headers }),
      axios.get(`${CONTRACT_URL}/api/contratos/empleado/${empleadoId}`,       { headers }),
      axios.get(`${VACATION_URL}/api/vacaciones/empleado/${empleadoId}`,      { headers }),
      axios.get(`${VACATION_URL}/api/vacaciones/empleado/${empleadoId}/disponibles`, { headers }),
    ]);

  const advertencias = [];
  const extraer = (resultado, nombre) => {
    if (resultado.status === 'fulfilled') return resultado.value.data;
    advertencias.push(`No se pudo obtener ${nombre}: ${resultado.reason?.message}`);
    return null;
  };

  return {
    empleado:       extraer(empleado,       'datos del empleado'),
    historial_cargo: extraer(historialCargo, 'historial de cargos'),
    contratos:      extraer(contratos,      'contratos'),
    vacaciones:     extraer(vacaciones,     'vacaciones'),
    disponibles:    extraer(disponibles,    'días disponibles'),
    advertencias,   // vacío si todo salió bien
    generado_en:    new Date().toISOString(),
  };
};
```

#### Reportes disponibles y qué servicios consulta cada uno

| Endpoint | Servicios consultados | Datos combinados |
|----------|----------------------|-----------------|
| `GET /estado-laboral` | Employee (lista + cargos) + Vacation (disponibles) | Empleados activos con cargo actual y días disponibles |
| `GET /vacaciones` | Vacation (solicitudes) + Employee (nombre empleado) | Resumen de solicitudes por estado y empleado |
| `GET /contratos` | Contract (contratos) + Employee (nombre empleado) | Contratos agrupados por tipo y estado |
| `GET /empleado/:id` | Employee + Contract + Vacation | Ficha completa del empleado |
| `GET /turnover` | Employee (retirados) + Contract (terminados) | Empleados retirados en un rango de fechas |

#### Variables de entorno
```env
PORT=3005
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui
EMPLOYEE_SERVICE_URL=http://employee-service:3002
CONTRACT_SERVICE_URL=http://contract-service:3003
VACATION_SERVICE_URL=http://vacation-service:3004
REQUEST_TIMEOUT_MS=8000
```

---

### Microservicio 6 — History Service

**Puerto:** 3006 | **Base de datos:** `history_db` | **Tablas:** `historial_cambios`, `acciones_sistema`

#### Responsabilidades
- Recibir y persistir registros de cambios enviados por los demás microservicios.
- Registrar acciones de seguridad del sistema (login, logout, token renovado, reportes generados).
- Proveer endpoints de consulta para auditoría, filtrados por empleado, usuario, entidad y rango de fechas.
- Ser un servicio **pasivo**: no llama a ningún otro servicio, solo recibe y almacena.

#### ¿Quién llama al History Service?
Todos los demás servicios hacen llamadas **fire-and-forget** al History Service cuando ocurre un evento relevante. "Fire-and-forget" significa que el servicio origen no espera la respuesta ni falla si el History Service está caído — la operación principal ya se completó:

```
Employee Service  → POST /api/historial/cambios  (al crear/editar empleado, al cambiar cargo)
Contract Service  → POST /api/historial/cambios  (al crear contrato, al agregar adenda)
Vacation Service  → POST /api/historial/cambios  (al aprobar/rechazar vacaciones)
Auth Service      → POST /api/historial/acciones (al hacer login, logout, refresh)
Report Service    → POST /api/historial/acciones (al generar reportes)
```

#### Flujo: Registrar cambio de campo
```
POST /api/historial/cambios
Body: {
  empleado_id, entidad, entidad_id,
  campo_modificado, valor_anterior, valor_nuevo,
  usuario_modificador, rol_modificador, ip_origen
}
  1. Valida que los campos requeridos estén presentes
  2. Inserta en historial_cambios
  3. Retorna 201 { id, fecha_modificacion }
```

#### Flujo: Registrar acción del sistema
```
POST /api/historial/acciones
Body: {
  usuario_email, rol, accion, entidad, entidad_id,
  resultado, detalle, ip_origen, user_agent
}
  1. Inserta en acciones_sistema
  2. Retorna 201 { id, fecha }
```

#### Flujo: Consultar historial de un empleado
```
GET /api/historial/cambios/empleado/:id?entidad=contrato&desde=2025-01-01&hasta=2025-12-31
  1. Verifica JWT (roles: admin, rrhh)
  2. Construye query con filtros opcionales: entidad, entidad_id, rango de fechas
  3. Retorna lista de cambios ordenada por fecha_modificacion DESC
```

#### Flujo: Consultar log de auditoría de seguridad
```
GET /api/historial/acciones?accion=login&resultado=fallido&desde=2025-01-01
  1. Verifica JWT (rol: admin únicamente)
  2. Aplica filtros: accion, resultado, usuario_email, rango de fechas
  3. Retorna lista de acciones con paginación
```

#### Estructura interna
```javascript
// history-service/src/services/history.service.js
const historialRepo = require('../repositories/historialCambios.repository');
const accionesRepo  = require('../repositories/accionesSistema.repository');

const registrarCambio = async (datos) => {
  const { empleado_id, entidad, entidad_id, campo_modificado,
          valor_anterior, valor_nuevo, usuario_modificador,
          rol_modificador, ip_origen } = datos;

  if (!empleado_id || !entidad || !campo_modificado || !usuario_modificador)
    throw { status: 400, message: 'Campos requeridos: empleado_id, entidad, campo_modificado, usuario_modificador' };

  return historialRepo.create({
    empleado_id, entidad, entidad_id, campo_modificado,
    valor_anterior: valor_anterior?.toString() ?? null,
    valor_nuevo:    valor_nuevo?.toString()    ?? null,
    usuario_modificador, rol_modificador, ip_origen
  });
};

const registrarAccion = async (datos) => {
  const { usuario_email, rol, accion, entidad, entidad_id,
          resultado = 'exitoso', detalle, ip_origen, user_agent } = datos;

  if (!accion) throw { status: 400, message: 'Campo requerido: accion' };

  return accionesRepo.create({
    usuario_email, rol, accion, entidad, entidad_id,
    resultado, detalle, ip_origen, user_agent
  });
};

const obtenerCambiosPorEmpleado = async (empleadoId, filtros = {}) => {
  const { entidad, entidad_id, desde, hasta, limit = 50, offset = 0 } = filtros;
  return historialRepo.findByEmpleado(empleadoId, { entidad, entidad_id, desde, hasta, limit, offset });
};

const obtenerAcciones = async (filtros = {}) => {
  const { accion, resultado, usuario_email, desde, hasta, limit = 50, offset = 0 } = filtros;
  return accionesRepo.findAll({ accion, resultado, usuario_email, desde, hasta, limit, offset });
};

module.exports = { registrarCambio, registrarAccion, obtenerCambiosPorEmpleado, obtenerAcciones };
```

```javascript
// Cliente reutilizable que usan los demás servicios para notificar al History Service
// Cada microservicio tiene una copia de este cliente
// history-service-client.js
const axios = require('axios');

const HISTORY_URL = process.env.HISTORY_SERVICE_URL;

const registrarCambio = (datos) =>
  axios.post(`${HISTORY_URL}/api/historial/cambios`, datos, { timeout: 3000 })
    .catch(err => console.error('[HistoryClient] No se pudo registrar cambio:', err.message));

const registrarAccion = (datos) =>
  axios.post(`${HISTORY_URL}/api/historial/acciones`, datos, { timeout: 3000 })
    .catch(err => console.error('[HistoryClient] No se pudo registrar acción:', err.message));

module.exports = { registrarCambio, registrarAccion };
```

#### Consultas útiles de auditoría

```sql
-- ¿Quién modificó el salario de un empleado y cuándo?
SELECT usuario_modificador, rol_modificador, valor_anterior, valor_nuevo, fecha_modificacion
FROM historial_cambios
WHERE empleado_id = $1 AND campo_modificado = 'salario'
ORDER BY fecha_modificacion DESC;

-- Intentos de login fallidos en las últimas 24 horas
SELECT usuario_email, ip_origen, COUNT(*) as intentos, MAX(fecha) as ultimo_intento
FROM acciones_sistema
WHERE accion = 'login'
  AND resultado = 'fallido'
  AND fecha >= NOW() - INTERVAL '24 hours'
GROUP BY usuario_email, ip_origen
ORDER BY intentos DESC;

-- Resumen de actividad del sistema por usuario en el último mes
SELECT usuario_email, rol, accion, COUNT(*) as total
FROM acciones_sistema
WHERE fecha >= NOW() - INTERVAL '30 days'
GROUP BY usuario_email, rol, accion
ORDER BY total DESC;
```

#### Variables de entorno
```env
PORT=3006
DATABASE_URL=postgres://postgres:password@postgres-history:5432/history_db
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui
```

---

### Comunicación entre microservicios — Resumen visual

```
Auth Service (3001)
  └─→ History Service: registra login, logout, token_renovado

Employee Service (3002)
  └─→ History Service: registra cambios de empleado, cargo, salario
  └─→ AWS S3: sube/descarga archivos via presigned URL

Contract Service (3003)
  └─→ Employee Service: verifica que el empleado existe (GET)
  └─→ History Service: registra creación de contrato y adendas

Vacation Service (3004)
  └─→ Employee Service: verifica que el empleado existe (GET)  [opcional, buena práctica]
  └─→ History Service: registra aprobación/rechazo de vacaciones
  └─→ SMTP: envía correos a RRHH

Report Service (3005)
  └─→ Employee Service: obtiene empleados, cargos (GET)
  └─→ Contract Service: obtiene contratos (GET)
  └─→ Vacation Service: obtiene vacaciones y disponibles (GET)
  └─→ History Service: registra generación de reportes (acción)

History Service (3006)
  └─→ No llama a ningún otro servicio (solo recibe)
```

---

## 7. Modelo de Datos Completo — por Microservicio

---

### 7.1 Auth Service — `DB Auth`

**¿Por qué estas tablas?**
`usuarios` maneja la identidad. `refresh_tokens` permite logout real: al hacer logout se marca el token como revocado, impidiendo que aunque alguien tenga el token físico, pueda usarlo. Sin esta tabla, un JWT robado es válido hasta que expire naturalmente.

```sql
-- Tabla 1: Usuarios del sistema
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    cedula          VARCHAR(20)  UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(200) NOT NULL,          -- bcrypt hash, nunca texto plano
    rol             VARCHAR(50)  NOT NULL            -- 'admin' | 'rrhh' | 'consulta'
                    CHECK (rol IN ('admin', 'rrhh', 'consulta')),
    activo          BOOLEAN DEFAULT TRUE,            -- permite suspender acceso sin eliminar
    ultimo_login    TIMESTAMP,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Refresh tokens (logout real y renovación de sesión)
CREATE TABLE refresh_tokens (
    id              SERIAL PRIMARY KEY,
    usuario_id      INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) UNIQUE NOT NULL,   -- hash SHA-256 del token, nunca el token crudo
    expires_at      TIMESTAMP NOT NULL,             -- cuándo expira este refresh token
    revocado        BOOLEAN DEFAULT FALSE,          -- true al hacer logout
    ip_origen       VARCHAR(45),                    -- IP desde donde se generó
    user_agent      TEXT,                           -- navegador/cliente que lo generó
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de rendimiento
CREATE INDEX idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_revocado   ON refresh_tokens(revocado, expires_at);
```

**Flujo de autenticación con refresh tokens:**
```
Login
  → genera access_token (JWT, expira en 1h)
  → genera refresh_token (opaco, expira en 7d)
  → guarda hash del refresh_token en refresh_tokens
  → retorna ambos al cliente

Cuando access_token expira
  → cliente envía refresh_token al endpoint POST /auth/refresh
  → servidor verifica: ¿existe en BD? ¿no está revocado? ¿no expiró?
  → genera nuevo access_token sin pedirle la contraseña al usuario

Logout
  → marca refresh_tokens.revocado = TRUE para ese token
  → el access_token queda inválido al expirar (máx 1h de ventana)
```

---

### 7.2 Employee Service — `DB Employee`

**¿Por qué estas tablas?**
`empleados` guarda datos de identidad. `cargos_salarios` mantiene el historial de cambios de cargo y salario con fechas exactas — si solo guardas cargo y salario en `empleados`, pierdes todo el historial de promociones y aumentos. `documentos_empleado` centraliza los archivos del empleado con tipo, descripción y URL en S3, en lugar de solo dos columnas fijas.

```sql
-- Tabla 1: Datos de identidad del empleado
CREATE TABLE empleados (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    apellido            VARCHAR(100) NOT NULL,
    cedula              VARCHAR(20)  UNIQUE NOT NULL,
    tipo_documento      VARCHAR(30)  DEFAULT 'cedula_ciudadania'
                        CHECK (tipo_documento IN ('cedula_ciudadania', 'cedula_extranjeria',
                                                   'pasaporte', 'tarjeta_identidad')),
    genero              VARCHAR(20)  CHECK (genero IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir')),
    fecha_nacimiento    DATE,
    celular             VARCHAR(20),
    telefono_fijo       VARCHAR(20),
    correo_personal     VARCHAR(150),
    correo_corporativo  VARCHAR(150),
    direccion           TEXT,
    ciudad              VARCHAR(100),
    departamento        VARCHAR(100),
    nivel_educativo     VARCHAR(50),                -- 'bachiller' | 'tecnico' | 'universitario' | 'posgrado'
    estado              VARCHAR(20)  DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'inactivo', 'vacaciones', 'licencia', 'retirado')),
    fecha_ingreso       DATE,                       -- fecha en que entró a la empresa
    fecha_retiro        DATE,                       -- null si aún está activo
    fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Historial de cargo y salario (fuente de verdad de promociones y aumentos)
CREATE TABLE cargos_salarios (
    id              SERIAL PRIMARY KEY,
    empleado_id     INT NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
    cargo           VARCHAR(100) NOT NULL,
    departamento    VARCHAR(100),
    salario         DECIMAL(12,2) NOT NULL,
    tipo_salario    VARCHAR(30) DEFAULT 'fijo'
                    CHECK (tipo_salario IN ('fijo', 'variable', 'por_hora')),
    fecha_inicio    DATE NOT NULL,                  -- desde cuándo aplica este cargo/salario
    fecha_fin       DATE,                           -- null = cargo/salario actual
    activo          BOOLEAN DEFAULT TRUE,           -- solo uno puede estar activo a la vez
    motivo_cambio   TEXT,                           -- ej: "Promoción a Senior", "Ajuste salarial anual"
    registrado_por  VARCHAR(150),                   -- email del usuario RRHH que hizo el cambio
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: Documentos del empleado (foto, CV, y cualquier archivo futuro)
CREATE TABLE documentos_empleado (
    id              SERIAL PRIMARY KEY,
    empleado_id     INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    tipo            VARCHAR(50) NOT NULL
                    CHECK (tipo IN ('foto', 'hoja_vida', 'certificado', 'diploma',
                                    'contrato_firmado', 'otro')),
    nombre_archivo  VARCHAR(255),                   -- nombre original del archivo
    s3_key          TEXT NOT NULL,                  -- clave del objeto en S3
    s3_url          TEXT NOT NULL,                  -- URL completa del objeto
    mime_type       VARCHAR(100),                   -- 'image/jpeg', 'application/pdf'
    tamano_bytes    BIGINT,
    activo          BOOLEAN DEFAULT TRUE,           -- false = versión anterior del mismo tipo
    subido_por      VARCHAR(150),
    fecha_subida    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de rendimiento
CREATE INDEX idx_empleados_cedula         ON empleados(cedula);
CREATE INDEX idx_empleados_estado         ON empleados(estado);
CREATE INDEX idx_cargos_salarios_emp      ON cargos_salarios(empleado_id, activo);
CREATE INDEX idx_documentos_empleado_tipo ON documentos_empleado(empleado_id, tipo, activo);
```

**Consulta: cargo y salario actual de un empleado**
```sql
SELECT cargo, departamento, salario, fecha_inicio
FROM cargos_salarios
WHERE empleado_id = $1 AND activo = TRUE
LIMIT 1;
```

**Consulta: historial completo de promociones**
```sql
SELECT cargo, salario, fecha_inicio, fecha_fin, motivo_cambio
FROM cargos_salarios
WHERE empleado_id = $1
ORDER BY fecha_inicio DESC;
```

---

### 7.3 Contract Service — `DB Contract`

**¿Por qué estas tablas?**
`contratos` guarda el contrato base. `adendas_contratos` registra cualquier modificación posterior (cambio de condiciones, extensión de plazo, etc.) sin alterar el contrato original, manteniendo trazabilidad legal completa. Esto es fundamental si el producto se va a usar en empresas reales.

```sql
-- Tabla 1: Contratos laborales
CREATE TABLE contratos (
    id                  SERIAL PRIMARY KEY,
    empleado_id         INT NOT NULL,               -- referencia lógica (validada via REST)
    tipo                VARCHAR(50) NOT NULL
                        CHECK (tipo IN ('indefinido', 'fijo', 'obra_labor',
                                        'aprendizaje', 'prestacion_servicios')),
    salario             DECIMAL(12,2) NOT NULL,
    moneda              VARCHAR(10) DEFAULT 'COP',
    fecha_inicio        DATE NOT NULL,
    fecha_fin           DATE,                       -- null para contratos indefinidos
    metodo_pago         VARCHAR(50)
                        CHECK (metodo_pago IN ('transferencia', 'cheque', 'efectivo')),
    periodicidad_pago   VARCHAR(50)
                        CHECK (periodicidad_pago IN ('mensual', 'quincenal', 'semanal')),
    lugar_trabajo       VARCHAR(150),               -- ciudad/ubicación
    modalidad           VARCHAR(50) DEFAULT 'presencial'
                        CHECK (modalidad IN ('presencial', 'remoto', 'hibrido')),
    jornada             VARCHAR(50) DEFAULT 'completa'
                        CHECK (jornada IN ('completa', 'medio_tiempo', 'flexible')),
    archivo_s3_key      TEXT,                       -- contrato firmado en S3 (opcional)
    archivo_s3_url      TEXT,
    estado              VARCHAR(20) DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'vencido', 'terminado', 'suspendido')),
    creado_por          VARCHAR(150),
    fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Adendas o modificaciones al contrato
CREATE TABLE adendas_contratos (
    id              SERIAL PRIMARY KEY,
    contrato_id     INT NOT NULL REFERENCES contratos(id) ON DELETE RESTRICT,
    numero_adenda   INT NOT NULL,                   -- correlativo por contrato: 1, 2, 3...
    descripcion     TEXT NOT NULL,                  -- qué cambió y por qué
    cambios_json    JSONB,                          -- snapshot de los cambios {campo: {antes, despues}}
    archivo_s3_key  TEXT,                           -- adenda firmada en S3 (opcional)
    archivo_s3_url  TEXT,
    fecha_vigencia  DATE NOT NULL,                  -- desde cuándo aplica la adenda
    creado_por      VARCHAR(150),
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (contrato_id, numero_adenda)             -- no puede haber dos adendas con el mismo número
);

-- Índices
CREATE INDEX idx_contratos_empleado_id ON contratos(empleado_id, estado);
CREATE INDEX idx_adendas_contrato_id   ON adendas_contratos(contrato_id);
```

**Ejemplo de `cambios_json` en una adenda:**
```json
{
  "salario":   { "antes": 4000000, "despues": 4500000 },
  "modalidad": { "antes": "presencial", "despues": "hibrido" }
}
```

---

### 7.4 Vacation Service — `DB Vacation`

**¿Por qué estas tablas?**
`vacaciones` registra cada solicitud. `dias_disponibles` es la **fuente de verdad** de cuántos días tiene disponibles cada empleado por año — sin esta tabla, calcular disponibilidad requiere recorrer todas las vacaciones históricas en tiempo real. `festivos` almacena los festivos en BD para que sean actualizables sin modificar código ni redesplegar (clave para producción real).

```sql
-- Tabla 1: Solicitudes de vacaciones
CREATE TABLE vacaciones (
    id               SERIAL PRIMARY KEY,
    empleado_id      INT NOT NULL,                  -- referencia lógica (validada via REST)
    fecha_inicio     DATE NOT NULL,
    fecha_fin        DATE NOT NULL,
    dias_habiles     INT NOT NULL,                  -- calculado automáticamente (excluye festivos y fines de semana)
    dias_calendario  INT NOT NULL,                  -- fecha_fin - fecha_inicio + 1
    estado           VARCHAR(20) DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
    justificacion    TEXT,                          -- motivo del empleado al solicitar
    motivo_rechazo   TEXT,                          -- motivo si RRHH rechaza
    aprobado_por     VARCHAR(150),                  -- email del RRHH que aprobó/rechazó
    fecha_aprobacion TIMESTAMP,
    notificado       BOOLEAN DEFAULT FALSE,         -- ¿se envió el correo a RRHH?
    fecha_solicitud  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Días de vacaciones disponibles por empleado por año
-- Esta tabla es la fuente de verdad para saber cuántos días le quedan a un empleado
CREATE TABLE dias_disponibles (
    id              SERIAL PRIMARY KEY,
    empleado_id     INT NOT NULL,
    anio            INT NOT NULL,                   -- año calendario: 2024, 2025...
    dias_totales    DECIMAL(5,1) NOT NULL,          -- días legales asignados (ej: 15.0)
    dias_usados     DECIMAL(5,1) DEFAULT 0,         -- días aprobados y tomados
    dias_pendientes DECIMAL(5,1) DEFAULT 0,         -- días en solicitudes pendientes
    dias_disponibles DECIMAL(5,1) GENERATED ALWAYS AS
                    (dias_totales - dias_usados - dias_pendientes) STORED,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (empleado_id, anio)                      -- un solo registro por empleado por año
);

-- Tabla 3: Festivos colombianos (actualizables desde la BD, sin tocar el código)
CREATE TABLE festivos (
    id          SERIAL PRIMARY KEY,
    fecha       DATE NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,              -- ej: "Día de la Independencia"
    anio        INT NOT NULL,                       -- año al que pertenece
    tipo        VARCHAR(50) DEFAULT 'nacional'
                CHECK (tipo IN ('nacional', 'regional', 'empresarial')),
    activo      BOOLEAN DEFAULT TRUE
);

-- Índices
CREATE INDEX idx_vacaciones_empleado_estado ON vacaciones(empleado_id, estado);
CREATE INDEX idx_vacaciones_fechas          ON vacaciones(fecha_inicio, fecha_fin);
CREATE INDEX idx_dias_disponibles_emp_anio  ON dias_disponibles(empleado_id, anio);
CREATE INDEX idx_festivos_fecha             ON festivos(fecha, activo);
CREATE INDEX idx_festivos_anio              ON festivos(anio, activo);
```

**Consulta: días disponibles de un empleado para el año actual**
```sql
SELECT dias_totales, dias_usados, dias_pendientes, dias_disponibles
FROM dias_disponibles
WHERE empleado_id = $1 AND anio = EXTRACT(YEAR FROM CURRENT_DATE);
```

**Consulta: verificar si una fecha es festivo**
```sql
SELECT EXISTS (
    SELECT 1 FROM festivos
    WHERE fecha = $1 AND activo = TRUE
);
```

**Seed de festivos colombianos 2025 (ejemplo):**
```sql
INSERT INTO festivos (fecha, descripcion, anio) VALUES
('2025-01-01', 'Año Nuevo',                               2025),
('2025-01-06', 'Reyes Magos',                             2025),
('2025-03-24', 'San José (trasladado)',                   2025),
('2025-04-17', 'Jueves Santo',                            2025),
('2025-04-18', 'Viernes Santo',                           2025),
('2025-05-01', 'Día del Trabajo',                         2025),
('2025-06-02', 'Ascensión del Señor',                     2025),
('2025-06-23', 'Corpus Christi',                          2025),
('2025-06-30', 'Sagrado Corazón',                         2025),
('2025-07-07', 'San Pedro y San Pablo (trasladado)',       2025),
('2025-07-20', 'Grito de Independencia',                  2025),
('2025-08-07', 'Batalla de Boyacá',                       2025),
('2025-08-18', 'Asunción de la Virgen (trasladado)',      2025),
('2025-10-13', 'Día de la Raza (trasladado)',              2025),
('2025-11-03', 'Todos los Santos (trasladado)',            2025),
('2025-11-17', 'Independencia de Cartagena (trasladado)', 2025),
('2025-12-08', 'Inmaculada Concepción',                   2025),
('2025-12-25', 'Navidad',                                 2025);
```

---

### 7.5 History Service — `DB History`

**¿Por qué estas tablas?**
`historial_cambios` es suficiente y correcta para auditoría, pero `acciones_sistema` captura eventos de alto nivel que no son cambios de campo (login, logout, generación de reportes), lo cual es valioso para auditorías de seguridad en empresas.

```sql
-- Tabla 1: Historial de cambios en campos específicos
CREATE TABLE historial_cambios (
    id                   SERIAL PRIMARY KEY,
    empleado_id          INT NOT NULL,              -- empleado afectado por el cambio
    entidad              VARCHAR(50) NOT NULL,       -- 'empleado' | 'contrato' | 'vacaciones'
    entidad_id           INT,                        -- id del registro modificado
    campo_modificado     VARCHAR(100) NOT NULL,
    valor_anterior       TEXT,
    valor_nuevo          TEXT,
    usuario_modificador  VARCHAR(150) NOT NULL,      -- email del usuario que hizo el cambio
    rol_modificador      VARCHAR(50),                -- rol del usuario en ese momento
    ip_origen            VARCHAR(45),
    fecha_modificacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Log de acciones generales del sistema (auditoría de seguridad)
CREATE TABLE acciones_sistema (
    id              SERIAL PRIMARY KEY,
    usuario_email   VARCHAR(150),                   -- null si es acción del sistema
    rol             VARCHAR(50),
    accion          VARCHAR(100) NOT NULL,           -- 'login' | 'logout' | 'reporte_generado' | 'token_renovado'
    entidad         VARCHAR(50),                    -- módulo afectado
    entidad_id      INT,
    resultado       VARCHAR(20) DEFAULT 'exitoso'
                    CHECK (resultado IN ('exitoso', 'fallido', 'denegado')),
    detalle         TEXT,                           -- información adicional
    ip_origen       VARCHAR(45),
    user_agent      TEXT,
    fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_historial_empleado_id ON historial_cambios(empleado_id, fecha_modificacion DESC);
CREATE INDEX idx_historial_entidad      ON historial_cambios(entidad, entidad_id);
CREATE INDEX idx_historial_usuario      ON historial_cambios(usuario_modificador);
CREATE INDEX idx_acciones_usuario       ON acciones_sistema(usuario_email, fecha DESC);
CREATE INDEX idx_acciones_accion        ON acciones_sistema(accion, resultado);
```

---

### 7.6 Report Service — Sin base de datos

El Report Service **no tiene base de datos propia**. Agrega datos en tiempo real llamando via HTTP REST a:
- Employee Service → lista de empleados y cargo/salario actual
- Contract Service → contratos por empleado
- Vacation Service → días disponibles y vacaciones por estado

Esto garantiza que los reportes siempre muestren datos frescos sin duplicar información.

---

### Resumen del Modelo de Datos

| Servicio | Tablas | Propósito |
|----------|--------|-----------|
| **Auth** | `usuarios`, `refresh_tokens` | Identidad + sesiones seguras con logout real |
| **Employee** | `empleados`, `cargos_salarios`, `documentos_empleado` | Datos de empleados + historial de carrera + archivos |
| **Contract** | `contratos`, `adendas_contratos` | Contratos + modificaciones con trazabilidad legal |
| **Vacation** | `vacaciones`, `dias_disponibles`, `festivos` | Solicitudes + disponibilidad por año + festivos en BD |
| **History** | `historial_cambios`, `acciones_sistema` | Auditoría de campos + log de seguridad |
| **Report** | — | Agrega via REST, sin BD propia |
| **Total** | **12 tablas** | Modelo profesional para uso empresarial real |

---

## 8. Migraciones de Base de Datos

Las migraciones garantizan que el esquema se cree y actualice de forma **automática y versionada** al iniciar Docker. Son idempotentes: si ya se ejecutaron, no vuelven a correr.

### Estructura de migraciones por servicio

```
auth-service/migrations/
├── 001_create_usuarios.js
└── 002_create_refresh_tokens.js

employee-service/migrations/
├── 001_create_empleados.js
├── 002_create_cargos_salarios.js
└── 003_create_documentos_empleado.js

contract-service/migrations/
├── 001_create_contratos.js
└── 002_create_adendas_contratos.js

vacation-service/migrations/
├── 001_create_festivos.js
├── 002_create_vacaciones.js
├── 003_create_dias_disponibles.js
└── 004_seed_festivos_2025.js          ← datos iniciales de festivos

history-service/migrations/
├── 001_create_historial_cambios.js
└── 002_create_acciones_sistema.js
```

### Ejemplo — Auth Service

```javascript
// auth-service/migrations/001_create_usuarios.js
exports.up = (pgm) => {
  pgm.createTable('usuarios', {
    id:                  { type: 'serial', primaryKey: true },
    cedula:              { type: 'varchar(20)', unique: true, notNull: true },
    email:               { type: 'varchar(150)', unique: true, notNull: true },
    password:            { type: 'varchar(200)', notNull: true },
    rol:                 { type: 'varchar(50)', notNull: true },
    activo:              { type: 'boolean', default: true },
    ultimo_login:        { type: 'timestamp' },
    fecha_creacion:      { type: 'timestamp', default: pgm.func('current_timestamp') },
    fecha_actualizacion: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('usuarios', 'chk_rol',
    "rol IN ('admin', 'rrhh', 'consulta')");
  pgm.createIndex('usuarios', 'email');
};
exports.down = (pgm) => { pgm.dropTable('usuarios'); };
```

```javascript
// auth-service/migrations/002_create_refresh_tokens.js
exports.up = (pgm) => {
  pgm.createTable('refresh_tokens', {
    id:             { type: 'serial', primaryKey: true },
    usuario_id:     { type: 'int', notNull: true, references: '"usuarios"', onDelete: 'CASCADE' },
    token_hash:     { type: 'varchar(255)', unique: true, notNull: true },
    expires_at:     { type: 'timestamp', notNull: true },
    revocado:       { type: 'boolean', default: false },
    ip_origen:      { type: 'varchar(45)' },
    user_agent:     { type: 'text' },
    fecha_creacion: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.createIndex('refresh_tokens', 'usuario_id');
  pgm.createIndex('refresh_tokens', 'token_hash');
  pgm.createIndex('refresh_tokens', ['revocado', 'expires_at']);
};
exports.down = (pgm) => { pgm.dropTable('refresh_tokens'); };
```

### Ejemplo — Vacation Service (con seed de festivos)

```javascript
// vacation-service/migrations/004_seed_festivos_2025.js
exports.up = (pgm) => {
  const festivos = [
    ['2025-01-01', 'Año Nuevo',                               2025],
    ['2025-01-06', 'Reyes Magos',                             2025],
    ['2025-04-17', 'Jueves Santo',                            2025],
    ['2025-04-18', 'Viernes Santo',                           2025],
    ['2025-05-01', 'Día del Trabajo',                         2025],
    ['2025-07-20', 'Grito de Independencia',                  2025],
    ['2025-08-07', 'Batalla de Boyacá',                       2025],
    ['2025-12-08', 'Inmaculada Concepción',                   2025],
    ['2025-12-25', 'Navidad',                                 2025],
    // ... resto de festivos
  ];
  festivos.forEach(([fecha, descripcion, anio]) => {
    pgm.sql(`
      INSERT INTO festivos (fecha, descripcion, anio)
      VALUES ('${fecha}', '${descripcion}', ${anio})
      ON CONFLICT (fecha) DO NOTHING;
    `);
  });
};
exports.down = (pgm) => {
  pgm.sql("DELETE FROM festivos WHERE anio = 2025;");
};
```

### Script de inicio en `package.json`

```json
{
  "scripts": {
    "migrate":      "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "start":        "npm run migrate && node src/index.js",
    "dev":          "npm run migrate && nodemon src/index.js"
  }
}
```

### Docker Compose con healthcheck

```yaml
auth-service:
  build: ./auth-service
  ports: ["3001:3001"]
  env_file: ./auth-service/.env
  depends_on:
    postgres-auth:
      condition: service_healthy
  restart: on-failure

postgres-auth:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB:       auth_db
    POSTGRES_USER:     postgres
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  volumes:
    - postgres_auth_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d auth_db"]
    interval: 5s
    timeout: 5s
    retries: 10

volumes:
  postgres_auth_data:
  postgres_employee_data:
  postgres_contract_data:
  postgres_vacation_data:
  postgres_history_data:
```

> **Importante:** los `volumes` garantizan que los datos persisten aunque el contenedor se reinicie. Sin ellos, cada `docker-compose down` borrará toda la información.

---

## 9. Almacenamiento de Archivos — AWS S3

### ¿Por qué S3 y no BYTEA?

| Criterio | BYTEA en PostgreSQL | AWS S3 |
|----------|---------------------|--------|
| Escalabilidad | BD crece y se vuelve lenta | Prácticamente ilimitada |
| Costo | Alto | ~$0.023 USD/GB/mes |
| Velocidad | Lenta (pasa por la BD) | Alta (CDN disponible) |
| Tipos de archivo | Ninguno | Soporte nativo de MIME |
| Backups | BD más pesada | Independiente de la BD |

### Flujo de Subida via Presigned URL

```
Frontend
  → POST /empleados/presigned-url  (solicita URL de subida)
Employee Service
  → genera presigned URL con SDK AWS (válida 5 min)
  → retorna { presigned_url, key }
Frontend
  → PUT directamente a S3 usando la presigned URL (binario nunca pasa por el backend)
Frontend
  → POST /empleados/:id/documentos  (confirma la subida con la key)
Employee Service
  → guarda en documentos_empleado: { tipo, s3_key, s3_url, mime_type, ... }
```

### Configuración S3

```javascript
// employee-service/src/config/s3.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const generarUrlSubida = async (empleadoId, tipo, contentType) => {
  const extension = contentType.split('/')[1];
  const key = `${tipo}s/${empleadoId}_${Date.now()}.${extension}`;
  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket:      process.env.S3_BUCKET_NAME,
    Key:         key,
    ContentType: contentType
  }), { expiresIn: 300 });
  return { url, key };
};

const generarUrlDescarga = async (key) =>
  getSignedUrl(s3, new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key:    key
  }), { expiresIn: 3600 });

module.exports = { generarUrlSubida, generarUrlDescarga };
```

---

## 10. Diseño de Pantallas

> Mockups en Figma: `[Agregar enlace]`

| Pantalla | Roles |
|----------|-------|
| Login | Todos |
| Dashboard — métricas generales | Admin, RRHH |
| Lista de Empleados | Todos |
| Detalle de Empleado — info, cargo/salario histórico, documentos | Todos |
| Formulario Empleado — registro/edición + upload S3 | Admin, RRHH |
| Contratos + Adendas | Admin, RRHH |
| Solicitud de Vacaciones — validaciones en tiempo real + días disponibles | Admin, RRHH |
| Gestión de Vacaciones — aprobación/rechazo | Admin, RRHH |
| Reportes | Todos |
| Administración de Usuarios | Admin |
| Log de Auditoría | Admin |

---

## 11. API REST Documentada

> Swagger: `[URL]` · Postman Collection: `[URL]`

### Auth Service — `/api/auth`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Registrar usuario (bcrypt hash) | ❌ |
| POST | `/login` | Login → access_token + refresh_token | ❌ |
| POST | `/refresh` | Renovar access_token con refresh_token | ❌ |
| POST | `/logout` | Revocar refresh_token actual | ✅ |
| POST | `/logout-all` | Revocar todos los refresh_tokens del usuario | ✅ |

```json
// POST /api/auth/login — Response 200
{
  "access_token":  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // expira en 1h
  "refresh_token": "d4f8a9b2c1e3...",                            // expira en 7 días
  "usuario": { "id": 1, "email": "admin@empresa.com", "rol": "admin" }
}

// POST /api/auth/refresh
// Request: { "refresh_token": "d4f8a9b2c1e3..." }
// Response 200: { "access_token": "nuevo_jwt..." }
// Response 401: { "error": "Token inválido o revocado" }
```

---

### Employee Service — `/api/empleados`

| Método | Endpoint | Descripción | Rol | Auth |
|--------|----------|-------------|-----|------|
| GET | `/` | Listar empleados (paginado) | Todos | ✅ |
| GET | `/:id` | Detalle del empleado | Todos | ✅ |
| POST | `/` | Registrar empleado | Admin, RRHH | ✅ |
| PATCH | `/:id` | Actualizar datos de identidad | Admin, RRHH | ✅ |
| DELETE | `/:id` | Desactivar empleado | Admin | ✅ |
| GET | `/:id/cargo-actual` | Cargo y salario actual | Todos | ✅ |
| GET | `/:id/historial-cargo` | Historial de cargos y salarios | Admin, RRHH | ✅ |
| POST | `/:id/cargo` | Registrar nuevo cargo/salario | Admin, RRHH | ✅ |
| GET | `/:id/documentos` | Listar documentos del empleado | Todos | ✅ |
| POST | `/presigned-url` | Obtener URL de subida a S3 | Admin, RRHH | ✅ |
| POST | `/:id/documentos` | Confirmar subida de documento | Admin, RRHH | ✅ |
| GET | `/documentos/:docId/url` | Obtener URL de descarga S3 | Todos | ✅ |

```json
// POST /api/empleados/:id/cargo — nuevo cargo/salario
{
  "cargo": "Desarrollador Senior",
  "departamento": "Tecnología",
  "salario": 6000000,
  "fecha_inicio": "2025-01-01",
  "motivo_cambio": "Promoción por desempeño anual"
}
// Response 201: registro creado; el anterior se marca activo=false
```

---

### Contract Service — `/api/contratos`

| Método | Endpoint | Descripción | Rol | Auth |
|--------|----------|-------------|-----|------|
| GET | `/empleado/:id` | Contratos de un empleado | Todos | ✅ |
| GET | `/:id` | Detalle de contrato + adendas | Todos | ✅ |
| POST | `/` | Crear contrato (valida empleado REST) | Admin, RRHH | ✅ |
| PATCH | `/:id` | Actualizar contrato | Admin | ✅ |
| POST | `/:id/adendas` | Agregar adenda al contrato | Admin, RRHH | ✅ |
| GET | `/:id/adendas` | Listar adendas del contrato | Todos | ✅ |

```json
// POST /api/contratos/:id/adendas
{
  "descripcion": "Cambio a modalidad híbrida por acuerdo mutuo",
  "cambios_json": {
    "modalidad": { "antes": "presencial", "despues": "hibrido" }
  },
  "fecha_vigencia": "2025-02-01"
}
```

---

### Vacation Service — `/api/vacaciones`

| Método | Endpoint | Descripción | Rol | Auth |
|--------|----------|-------------|-----|------|
| GET | `/empleado/:id` | Vacaciones de un empleado | Todos | ✅ |
| GET | `/empleado/:id/disponibles` | Días disponibles del año actual | Todos | ✅ |
| POST | `/` | Solicitar vacaciones | Admin, RRHH | ✅ |
| PATCH | `/:id/aprobar` | Aprobar solicitud | Admin, RRHH | ✅ |
| PATCH | `/:id/rechazar` | Rechazar con motivo | Admin, RRHH | ✅ |
| PATCH | `/:id/cancelar` | Cancelar solicitud pendiente | Admin, RRHH | ✅ |
| GET | `/festivos/:anio` | Festivos de un año | Todos | ✅ |
| POST | `/festivos` | Agregar festivo | Admin | ✅ |

**Reglas de Negocio:**
- Mínimo **5 días hábiles** por solicitud.
- Anticipación mínima de **1 mes**.
- Excluye **fines de semana y festivos** de la tabla `festivos`.
- Se valida que el empleado tenga **días disponibles** suficientes.
- Al aprobar → `dias_disponibles.dias_usados += dias_habiles`.
- Al poner en pendiente → `dias_disponibles.dias_pendientes += dias_habiles`.
- RRHH tiene **3 días hábiles** para responder.

```json
// GET /api/vacaciones/empleado/15/disponibles — Response 200
{
  "empleado_id": 15,
  "anio": 2025,
  "dias_totales": 15,
  "dias_usados": 5,
  "dias_pendientes": 0,
  "dias_disponibles": 10
}

// POST /api/vacaciones — Response 400 (sin días disponibles)
{ "error": "El empleado solo tiene 3 días disponibles y solicitó 5" }
```

---

### Report Service — `/api/reportes`

| Método | Endpoint | Descripción | Rol | Auth |
|--------|----------|-------------|-----|------|
| GET | `/estado-laboral` | Empleados activos con cargo actual | Todos | ✅ |
| GET | `/vacaciones` | Resumen de vacaciones (disponibles, usadas, pendientes) | Todos | ✅ |
| GET | `/contratos` | Contratos por tipo y estado | Todos | ✅ |
| GET | `/empleado/:id` | Reporte completo de un empleado | Admin, RRHH | ✅ |
| GET | `/turnover` | Empleados retirados en un período | Admin | ✅ |

---

### History Service — `/api/historial`

| Método | Endpoint | Descripción | Rol | Auth |
|--------|----------|-------------|-----|------|
| POST | `/cambios` | Registrar cambio (llamado por otros servicios) | Interno | ✅ |
| GET | `/cambios/empleado/:id` | Historial de un empleado | Admin, RRHH | ✅ |
| GET | `/cambios` | Listado general con filtros | Admin | ✅ |
| POST | `/acciones` | Registrar acción del sistema | Interno | ✅ |
| GET | `/acciones` | Log de acciones con filtros | Admin | ✅ |

---

### Códigos de Estado HTTP

| Código | Significado |
|--------|------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request — validación o regla de negocio |
| 401 | Unauthorized — token ausente, inválido o revocado |
| 403 | Forbidden — sin permisos para la acción |
| 404 | Not Found |
| 409 | Conflict — recurso duplicado |
| 503 | Service Unavailable — microservicio dependiente no responde |
| 500 | Internal Server Error |

---

## 12. Casos de Prueba y Evidencias

### Estrategia de Pruebas

```
         /──────────────────────────────────────────────\
        /   E2E — Playwright (flujos completos)           \
       /────────────────────────────────────────────────── \
      /   Integración — Playwright API Testing              \
     /────────────────────────────────────────────────────── \
    /   Unitarias — Jest (lógica de negocio aislada)          \
   /────────────────────────────────────────────────────────── \
  /   Performance — Grafana k6 (Load + Stress)                  \
 /──────────────────────────────────────────────────────────────\
```

> Las pruebas del **Auth Service ya fueron implementadas por el compañero** (unitarias + E2E + integración). Los demás servicios se implementan en el repositorio `hr-system-tests`.

### Casos de Prueba — Auth Service ✅ (ya implementado)

| ID | Caso | Tipo |
|----|------|------|
| TC-AUTH-001 | Login exitoso retorna access_token + refresh_token | Positivo |
| TC-AUTH-002 | Login con contraseña incorrecta retorna 401 | Negativo |
| TC-AUTH-003 | Refresh token válido retorna nuevo access_token | Positivo |
| TC-AUTH-004 | Refresh token revocado retorna 401 | Negativo |
| TC-AUTH-005 | Logout revoca el refresh_token en BD | Positivo |
| TC-AUTH-006 | Acceso a endpoint protegido sin token retorna 401 | Negativo |

### Casos de Prueba — Employee Service

| ID | Caso | Tipo | Resultado Esperado |
|----|------|------|-------------------|
| TC-EMP-001 | Registrar empleado completo | Positivo | 201 Created |
| TC-EMP-002 | Registrar con cédula duplicada | Negativo | 409 Conflict |
| TC-EMP-003 | Registrar cargo nuevo → cierra el anterior | Positivo | activo=false en cargo anterior |
| TC-EMP-004 | Consultar historial de cargos | Positivo | Lista ordenada por fecha |
| TC-EMP-005 | Solicitar presigned URL para foto | Positivo | URL S3 válida |
| TC-EMP-006 | Editar con rol Consulta | Negativo | 403 Forbidden |

### Casos de Prueba — Vacation Service

| ID | Caso | Tipo | Resultado Esperado |
|----|------|------|-------------------|
| TC-VAC-001 | Solicitar 5 días hábiles con 1 mes de anticipación | Positivo | 201; días_pendientes += 5 |
| TC-VAC-002 | Solicitar con menos de 5 días hábiles | Negativo | 400 |
| TC-VAC-003 | Solicitar sin 1 mes de anticipación | Negativo | 400 |
| TC-VAC-004 | Solicitar más días de los disponibles | Negativo | 400 |
| TC-VAC-005 | Solicitar en festivo colombiano | Negativo | 400 |
| TC-VAC-006 | Aprobar solicitud → actualiza dias_usados | Positivo | dias_usados += dias_habiles |
| TC-VAC-007 | Rechazar solicitud → libera dias_pendientes | Positivo | dias_pendientes -= dias_habiles |
| TC-VAC-008 | Consultar días disponibles retorna cálculo correcto | Positivo | dias_disponibles = totales - usados - pendientes |

### Ejemplo — Prueba Unitaria (Jest)

```javascript
describe('Vacation Service — Validaciones de negocio', () => {

  test('TC-VAC-002: Rechaza con menos de 5 días hábiles', () => {
    const inicio = new Date('2025-03-03'); // lunes
    const fin    = new Date('2025-03-05'); // miércoles = 3 días hábiles
    expect(() => validarDiasHabiles(inicio, fin, festivos2025))
      .toThrow('Mínimo 5 días hábiles requeridos');
  });

  test('TC-VAC-004: Rechaza si no hay días disponibles suficientes', async () => {
    const mockDias = { dias_disponibles: 3 };
    jest.spyOn(diasRepo, 'obtenerPorEmpleadoAnio').mockResolvedValue(mockDias);
    const res = await request(app)
      .post('/api/vacaciones')
      .set('Authorization', `Bearer ${tokenRRHH}`)
      .send({ empleado_id: 1, fecha_inicio: '2025-04-07', fecha_fin: '2025-04-11' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/días disponibles/);
  });

  test('TC-VAC-006: Aprobar actualiza dias_usados correctamente', async () => {
    await request(app)
      .patch('/api/vacaciones/1/aprobar')
      .set('Authorization', `Bearer ${tokenRRHH}`);
    const disponibles = await diasRepo.obtenerPorEmpleadoAnio(1, 2025);
    expect(disponibles.dias_usados).toBe(5);
    expect(disponibles.dias_pendientes).toBe(0);
  });
});
```

---

## 13. Pruebas de Performance con Grafana k6

### Métricas Clave

| Métrica | Descripción | Umbral (threshold) |
|---------|-------------|-------------------|
| `http_req_duration` | Tiempo total del request | **p(95) < 500ms** |
| `http_req_waiting` (TTFB) | Tiempo de procesamiento del backend | avg < 300ms |
| `http_req_failed` | Porcentaje de requests fallidas | **< 1%** |
| `http_reqs` | Throughput (requests/segundo) | Se reporta |
| `iteration_duration` | Tiempo del flujo completo | avg < 2s |
| `checks` | Validaciones exitosas por request | **100% OK** |
| `vus` / `vus_max` | Usuarios virtuales activos / pico | Según escenario |
| `data_received` / `data_sent` | Volumen de datos | Se reporta |

### Interpretación de Percentiles

| Percentil | Qué significa | Umbral recomendado |
|-----------|--------------|-------------------|
| `p(90)` | 90% de usuarios con ese tiempo o menos | Indicador general |
| `p(95)` | Estándar SLA de producción | **< 500ms** |
| `p(99)` | Casos extremos (1% de peor experiencia) | < 1000ms |

### Prueba de Carga — Employee Service

```javascript
// tests/performance/load/employees-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // rampa de subida
    { duration: '3m', target: 30 },   // carga sostenida — 30 usuarios
    { duration: '1m', target: 0  },   // bajada gradual
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed:   ['rate<0.01'],
    errors:            ['rate<0.01'],
  },
};

export function setup() {
  const res = http.post(
    `${__ENV.AUTH_URL}/api/auth/login`,
    JSON.stringify({ email: 'rrhh@empresa.com', password: 'Test1234!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: res.json('access_token') };
}

export default function (data) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Listar empleados
  const listar = http.get(`${__ENV.BASE_URL}/api/empleados`, { headers });
  check(listar, {
    'status 200':           (r) => r.status === 200,
    'respuesta < 500ms':    (r) => r.timings.duration < 500,
    'retorna array':        (r) => Array.isArray(r.json()),
  });
  errorRate.add(listar.status !== 200);
  sleep(1);

  // Consultar cargo actual
  const cargo = http.get(`${__ENV.BASE_URL}/api/empleados/1/cargo-actual`, { headers });
  check(cargo, {
    'status 200 o 404':     (r) => [200, 404].includes(r.status),
    'respuesta < 500ms':    (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Prueba de Estrés — Vacation Service

```javascript
// tests/performance/stress/vacations-stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20  },   // nivel normal
    { duration: '5m', target: 50  },   // carga alta
    { duration: '2m', target: 100 },   // estrés — punto de quiebre
    { duration: '5m', target: 100 },   // mantener estrés
    { duration: '2m', target: 0   },   // recuperación
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
  },
};

export function setup() {
  const res = http.post(
    `${__ENV.AUTH_URL}/api/auth/login`,
    JSON.stringify({ email: 'admin@empresa.com', password: 'Admin1234!' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: res.json('access_token') };
}

export default function (data) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Consultar disponibilidad de vacaciones
  const res = http.get(`${__ENV.BASE_URL}/api/vacaciones/empleado/1/disponibles`, { headers });
  check(res, {
    'status 200':        (r) => r.status === 200,
    'latencia < 2000ms': (r) => r.timings.duration < 2000,
    'sin error 500':     (r) => r.status !== 500,
    'tiene campo dias_disponibles': (r) => r.json('dias_disponibles') !== undefined,
  });
  sleep(0.5);
}
```

### Ejemplo de Output y Cómo Interpretarlo

```
✓ status 200
✓ respuesta < 500ms
✓ retorna array

checks.........................: 100.00% ✓ 9012   ✗ 0
data_received..................: 1.6 MB  5.3 kB/s
data_sent......................: 980 kB  3.3 kB/s
http_req_duration..............: avg=141ms  p(90)=169ms  p(95)=175ms  p(99)=238ms
http_req_failed................: 0.00%   ✓ 0      ✗ 5004
http_req_waiting...............: avg=141ms
http_reqs......................: 5004    27.12/s
iteration_duration.............: avg=1.28s
vus............................: 30      min=10   max=30
```

| Resultado | Valor | Interpretación |
|-----------|-------|----------------|
| `p(95)=175ms` | ✅ | Cumple SLA de < 500ms |
| `http_req_failed=0.00%` | ✅ | Sistema estable bajo carga |
| `checks=100%` | ✅ | Toda la lógica funciona bajo carga |
| `iteration_duration avg=1.28s` | ✅ | Buena experiencia de usuario |

**Señales de alerta:**
- `p(95) > 500ms` → revisar índices en BD, optimizar queries lentas.
- `http_req_failed > 1%` → revisar logs y timeouts entre microservicios.
- `checks < 100%` → hay errores funcionales bajo carga.

### Comandos de Ejecución

```bash
# Instalar k6
brew install k6          # macOS
sudo apt install k6      # Ubuntu/Debian

# Prueba de carga
k6 run \
  --env BASE_URL=http://localhost:3002 \
  --env AUTH_URL=http://localhost:3001 \
  tests/performance/load/employees-load.js

# Prueba de estrés
k6 run \
  --env BASE_URL=http://localhost:3004 \
  --env AUTH_URL=http://localhost:3001 \
  tests/performance/stress/vacations-stress.js

# Con reporte JSON para evidencia
k6 run --out json=tests/performance/results/load-result.json \
  tests/performance/load/employees-load.js
```

---

## 14. Guía de Ejecución

### Requisitos Previos

| Herramienta | Versión Mínima |
|------------|---------------|
| Node.js | 18.x |
| Docker | 24.x |
| Docker Compose | 2.x |
| Git | 2.x |
| k6 | 0.49.x |
| Cuenta AWS | — (S3) |

### Variables de Entorno por Servicio

**auth-service/.env**
```env
PORT=3001
DATABASE_URL=postgres://postgres:password@postgres-auth:5432/auth_db
JWT_SECRET=min_32_caracteres_aqui_muy_seguro_1234
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7
```

**employee-service/.env**
```env
PORT=3002
DATABASE_URL=postgres://postgres:password@postgres-employee:5432/employee_db
JWT_SECRET=min_32_caracteres_aqui_muy_seguro_1234
AUTH_SERVICE_URL=http://auth-service:3001
HISTORY_SERVICE_URL=http://history-service:3006
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=hr-system-empleados
```

**contract-service/.env**
```env
PORT=3003
DATABASE_URL=postgres://postgres:password@postgres-contract:5432/contract_db
JWT_SECRET=min_32_caracteres_aqui_muy_seguro_1234
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
```

**vacation-service/.env**
```env
PORT=3004
DATABASE_URL=postgres://postgres:password@postgres-vacation:5432/vacation_db
JWT_SECRET=min_32_caracteres_aqui_muy_seguro_1234
EMPLOYEE_SERVICE_URL=http://employee-service:3002
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_gmail
HISTORY_SERVICE_URL=http://history-service:3006
```

**report-service/.env**
```env
PORT=3005
JWT_SECRET=min_32_caracteres_aqui_muy_seguro_1234
EMPLOYEE_SERVICE_URL=http://employee-service:3002
CONTRACT_SERVICE_URL=http://contract-service:3003
VACATION_SERVICE_URL=http://vacation-service:3004
```

**history-service/.env**
```env
PORT=3006
DATABASE_URL=postgres://postgres:password@postgres-history:5432/history_db
JWT_SECRET=min_32_caracteres_aqui_muy_seguro_1234
```

### Levantar con Docker Compose

```bash
git clone https://github.com/tu-usuario/hr-system-backend.git
cd hr-system-backend

# Copiar y configurar variables de entorno
for svc in auth employee contract vacation report history; do
  cp ${svc}-service/.env.example ${svc}-service/.env
done
# Editar cada .env con valores reales

# Levantar (migraciones y seeds corren automáticamente)
docker-compose up --build

# Verificar
docker-compose ps
docker-compose logs vacation-service | grep -i "seed\|migrat"
```

### Ejecutar Pruebas

```bash
# Unitarias por servicio
cd vacation-service && npm test
cd contract-service && npm test

# Con cobertura
npm run test:coverage

# E2E Playwright (sistema levantado)
cd ../hr-system-tests && npx playwright test

# Performance k6
k6 run --env BASE_URL=http://localhost:3002 \
        --env AUTH_URL=http://localhost:3001 \
        performance/load/employees-load.js
```

---

## 15. Monetización

| Plan | Precio/mes | Empleados | Características |
|------|-----------|-----------|----------------|
| **Básico** | $49.000 COP | Hasta 20 | Auth, Empleados, Contratos |
| **Profesional** | $129.000 COP | Hasta 100 | + Vacaciones, Reportes, Historial |
| **Empresarial** | $299.000 COP | Ilimitados | + Soporte prioritario, SLA, log de auditoría |

### Costos de Infraestructura (Mensual)

| Servicio | Estimado |
|---------|---------|
| Backend microservicios (Render/Railway) | $15–40 USD |
| Frontend (Vercel) | $0–20 USD |
| PostgreSQL administrado | $10–25 USD |
| AWS S3 | $1–5 USD |
| SMTP (SendGrid) | $0–15 USD |
| **Total** | **$26–105 USD/mes** |

---

## 16. Estrategia de Visibilidad

1. **LinkedIn:** publicaciones orientadas a gerentes de RRHH y dueños de PyMEs colombianas.
2. **Grupos de empresarios:** Facebook, WhatsApp.
3. **Referidos:** descuento del 20% por empresa referida.
4. **Trial gratuito:** 30 días sin tarjeta.
5. **SEO:** blog sobre legislación laboral colombiana.
6. **Alianzas:** contadores y asesores laborales.

---

## 17. Estudio de Mercado

| Aplicación | Precio | Diferencia |
|-----------|--------|-----------|
| BambooHR | $6–12 USD/empleado/mes | No adaptado a Colombia, caro |
| Factorial HR | €4–8/empleado/mes | Enfocado en Europa |
| Acsendo (CO) | Cotización | Solo evaluación de desempeño |
| Siigo Nómina (CO) | Desde $79K COP/mes | Solo nómina |
| Excel/Sheets | Gratis | Sin validaciones, roles ni trazabilidad |

**Nuestra ventaja:** precio fijo por empresa (no por empleado), 100% español, festivos y legislación colombiana integrados, historial de carrera real, gestión de sesiones segura con refresh tokens.

---

## 18. Roadmap y Mejoras Futuras

### v1.0 — MVP Actual
- [x] Auth con JWT + refresh tokens + logout real
- [x] Empleados con historial de cargo/salario y documentos en S3
- [x] Contratos con adendas y validación REST
- [x] Vacaciones con días disponibles, festivos en BD y SMTP
- [x] Reportes sin BD propia
- [x] Historial y log de auditoría
- [x] Migraciones + seeds automáticos en Docker
- [x] Pruebas unitarias, E2E (Playwright), Performance (k6)

### v1.1 — Q2 2025
- [ ] Portal de autoservicio para empleados
- [ ] Exportación de reportes a Excel/PDF
- [ ] Notificaciones push + email para aprobaciones

### v1.2 — Q3 2025
- [ ] Módulo de nómina básica
- [ ] Firma digital de contratos
- [ ] Dashboard con gráficas de rotación y vacaciones

### v2.0 — Q4 2025
- [ ] App móvil (React Native)
- [ ] Integración con Siigo / Alegra
- [ ] Multi-empresa (multi-tenant)
- [ ] IA para predicción de rotación de personal

---

## 19. Diagramas Obligatorios

> Versiones editables en `/docs/diagrams/` (draw.io / PlantUML).

---

### 19.1 Diagrama de Secuencia — Flujo Principal Completo

```
RRHH/Admin  Frontend   AuthSvc   EmployeeSvc  S3 Bucket  ContractSvc  VacationSvc  HistorySvc  SMTP
    │           │          │           │            │            │            │            │        │
    │──Login───►│          │           │            │            │            │            │        │
    │           │──POST /login─────────►│           │            │            │            │        │
    │           │◄──access+refresh token│           │            │            │            │        │
    │◄──tokens──│          │           │            │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Reg. empleado──────►│           │            │            │            │            │        │
    │           │──POST /empleados──────────────────►            │            │            │        │
    │           │          │           │──Valida JWT│            │            │            │        │
    │           │          │           │──Guarda en BD           │            │            │        │
    │           │◄──201 + empleado_id───│           │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Subir foto─────────►│           │            │            │            │            │        │
    │           │──POST /presigned-url──────────────►            │            │            │        │
    │           │          │           │──genera presigned URL────────────────────────────────────► │
    │           │◄──presigned_url + key─│           │            │            │            │        │
    │──Sube foto directo a S3──────────────────────────────────►│            │            │        │
    │           │──POST /empleados/:id/documentos────────────────►            │            │        │
    │           │          │           │──guarda en documentos_empleado       │            │        │
    │           │          │           │──POST /historial──────────────────────────────────►       │
    │           │◄──201─────────────────│           │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Crear contrato─────►│           │            │            │            │            │        │
    │           │──POST /contratos──────────────────────────────►│            │            │        │
    │           │          │           │◄──GET /empleados/:id────►            │            │        │
    │           │          │           │──200 empleado existe────►            │            │        │
    │           │          │           │            │            │──guarda contrato        │        │
    │           │◄──201 contrato────────────────────────────────│            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Solicitar vacaciones►│           │            │            │            │            │        │
    │           │──POST /vacaciones──────────────────────────────────────────►│            │        │
    │           │          │           │            │            │            │──Valida reglas       │
    │           │          │           │            │            │            │──Verifica festivos BD│
    │           │          │           │            │            │            │──Verifica días dispon│
    │           │          │           │            │            │            │──dias_pendientes += N│
    │           │          │           │            │            │            │──Email a RRHH───────►│
    │           │◄──201 solicitud────────────────────────────────────────────│            │        │
    │           │          │           │            │            │            │            │        │
    │──Aprobar─────────────►│           │            │            │            │            │        │
    │           │──PATCH /vacaciones/:id/aprobar──────────────────────────────────────────►│        │
    │           │          │           │            │            │            │──actualiza estado    │
    │           │          │           │            │            │            │──dias_usados += N    │
    │           │          │           │            │            │            │──dias_pendientes -= N│
    │           │          │           │            │            │            │──POST /historial─────►
    │           │          │           │            │            │            │──Email aprobación───►│
    │           │◄──200 aprobada──────────────────────────────────────────────│            │        │
```

---

### 19.2 Diagrama de Componentes — Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  CLIENTE (Navegador)                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │  FRONTEND — React + Vite + TailwindCSS  [Vercel]                                │ │
│  │  ┌──────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────┐  │ │
│  │  │   Auth   │  │ Employees  │  │  Vacations  │  │Contracts │  │   Reports   │  │ │
│  │  │ - Login  │  │ - CRUD     │  │ - Solicitar │  │ - CRUD   │  │ - Vistas    │  │ │
│  │  │ - JWT    │  │ - S3 upload│  │ - Aprobar   │  │ - Adendas│  │ - Filtros   │  │ │
│  │  │ - Refresh│  │ - Historial│  │ - Días disp.│  │          │  │ - Auditoría │  │ │
│  │  └──────────┘  └────────────┘  └─────────────┘  └──────────┘  └─────────────┘  │ │
│  └──────────────────────────────────────┬──────────────────────────────────────────┘ │
└─────────────────────────────────────────│──────────────────────────────────────────── ┘
                                          │ HTTPS + Bearer Token (JWT)
┌─────────────────────────────────────────▼──────────────────────────────────────────── ┐
│  BACKEND — Microservicios [Railway / Render]                                            │
│                                                                                         │
│  ┌──────────────────────┐    ┌──────────────────────────────┐                          │
│  │  Auth Service :3001  │    │  Employee Service :3002       │                          │
│  │──────────────────────│    │──────────────────────────────│                          │
│  │ usuarios             │    │ empleados                     │                          │
│  │ refresh_tokens       │    │ cargos_salarios               │    ┌───────────────────┐ │
│  │                      │    │ documentos_empleado           │───►│   AWS S3          │ │
│  │ POST /login          │    │                               │    │   /fotos/         │ │
│  │ POST /refresh        │    │ GET/POST /empleados           │    │   /hojas-de-vida/ │ │
│  │ POST /logout         │    │ POST /:id/cargo               │    │   presigned URLs  │ │
│  │ bcrypt + JWT         │    │ POST /presigned-url           │    └───────────────────┘ │
│  └──────────────────────┘    └────────────────┬─────────────┘                          │
│                                               │ REST                                    │
│  ┌──────────────────────┐    ┌───────────────▼──────────────┐                          │
│  │  Contract Svc :3003  │    │  Vacation Service :3004       │                          │
│  │──────────────────────│    │──────────────────────────────│    ┌───────────────────┐ │
│  │ contratos            │    │ vacaciones                    │───►│  SMTP (Nodemailer)│ │
│  │ adendas_contratos    │    │ dias_disponibles              │    │  Email a RRHH     │ │
│  │                      │    │ festivos (seed CO)            │    └───────────────────┘ │
│  │ POST /contratos      │    │                               │                          │
│  │  └─ valida REST ────►│    │ POST /vacaciones              │                          │
│  │ POST /:id/adendas    │    │ PATCH /:id/aprobar            │                          │
│  └──────────────────────┘    └──────────────────────────────┘                          │
│                                                                                         │
│  ┌──────────────────────┐    ┌──────────────────────────────┐                          │
│  │  Report Svc :3005    │    │  History Service :3006        │                          │
│  │──────────────────────│    │──────────────────────────────│                          │
│  │  SIN BD propia       │    │ historial_cambios             │                          │
│  │  Agrega via REST:    │    │ acciones_sistema              │                          │
│  │  → Employee Svc      │    │                               │                          │
│  │  → Contract Svc      │    │ POST /cambios                 │                          │
│  │  → Vacation Svc      │    │ GET /acciones (auditoría)     │                          │
│  └──────────────────────┘    └──────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 19.3 Diagrama Entidad-Relación Completo

```
╔══════════════════════════════╗     ╔══════════════════════════════════════════════════╗
║  [DB AUTH]                   ║     ║  [DB EMPLOYEE]                                   ║
╠══════════════════════════════╣     ╠══════════════════════════════════════════════════╣
║  usuarios                    ║     ║  empleados                                       ║
║  ─────────────────────────── ║     ║  ───────────────────────────────────────────────║
║  id            SERIAL PK     ║     ║  id               SERIAL PK                     ║
║  cedula        VARCHAR UK     ║JWT  ║  nombre / apellido VARCHAR NN                   ║
║  email         VARCHAR UK     ║────►║  cedula           VARCHAR UK                    ║
║  password      VARCHAR NN     ║     ║  tipo_documento   VARCHAR                       ║
║  rol           VARCHAR NN     ║     ║  genero / fecha_nacimiento                      ║
║  activo        BOOLEAN        ║     ║  celular / correo_personal / corporativo         ║
║  ultimo_login  TIMESTAMP      ║     ║  estado           VARCHAR CHECK                 ║
║                               ║     ║  fecha_ingreso / fecha_retiro DATE              ║
║  refresh_tokens               ║     ╚══════════════════╤═══════════════════════════════╝
║  ─────────────────────────── ║                        │ 1:N
║  id            SERIAL PK     ║                        │
║  usuario_id    FK usuarios    ║      ┌─────────────────┼───────────────────────────┐
║  token_hash    VARCHAR UK     ║      │                 │                           │
║  expires_at    TIMESTAMP      ║  ╔══╧════════════╗  ╔══╧════════════════╗         │
║  revocado      BOOLEAN        ║  ║ cargos_salarios║  ║documentos_empleado║         │
║  ip_origen     VARCHAR        ║  ╠════════════════╣  ╠═══════════════════╣         │
╚══════════════════════════════╝  ║ id    SERIAL PK ║  ║ id      SERIAL PK ║         │
                                  ║ empleado_id FK  ║  ║ empleado_id FK    ║         │
                                  ║ cargo  VARCHAR  ║  ║ tipo    VARCHAR   ║         │
                                  ║ departamento    ║  ║ s3_key  TEXT      ║─────────────► AWS S3
                                  ║ salario DECIMAL ║  ║ s3_url  TEXT      ║         │
                                  ║ fecha_inicio    ║  ║ mime_type         ║         │
                                  ║ fecha_fin       ║  ║ activo  BOOLEAN   ║         │
                                  ║ activo  BOOLEAN ║  ╚═══════════════════╝         │
                                  ║ motivo_cambio   ║                                │
                                  ╚════════════════╝              empleado_id (lógico REST)
                                                                                     │
╔════════════════════════════════════╗   ╔══════════════════════════╗   ╔════════════╧══════════════╗
║  [DB CONTRACT]                     ║   ║  [DB VACATION]           ║   ║  [DB HISTORY]             ║
╠════════════════════════════════════╣   ╠══════════════════════════╣   ╠═══════════════════════════╣
║  contratos                         ║   ║  vacaciones              ║   ║  historial_cambios        ║
║  ──────────────────────────────────║   ║  ────────────────────────║   ║  ─────────────────────── ║
║  id             SERIAL PK          ║   ║  id          SERIAL PK   ║   ║  id            SERIAL PK ║
║  empleado_id    INT (REST)          ║   ║  empleado_id INT (REST)  ║   ║  empleado_id   INT        ║
║  tipo           VARCHAR CHECK       ║   ║  fecha_inicio DATE NN    ║   ║  entidad       VARCHAR    ║
║  salario        DECIMAL NN          ║   ║  fecha_fin   DATE NN     ║   ║  entidad_id    INT        ║
║  fecha_inicio   DATE NN             ║   ║  dias_habiles INT NN     ║   ║  campo_modif.  VARCHAR    ║
║  fecha_fin      DATE                ║   ║  dias_calendar INT NN   ║   ║  val_anterior  TEXT       ║
║  modalidad      VARCHAR CHECK       ║   ║  estado      VARCHAR     ║   ║  val_nuevo     TEXT       ║
║  jornada        VARCHAR CHECK       ║   ║  justificacion TEXT      ║   ║  usuario_modif VARCHAR    ║
║  estado         VARCHAR CHECK       ║   ║  motivo_rechazo TEXT     ║   ║  rol_modif.    VARCHAR    ║
║  archivo_s3_url TEXT                ║   ║  aprobado_por  VARCHAR   ║   ║  fecha_modif.  TIMESTAMP  ║
║                                     ║   ║  notificado    BOOLEAN   ║   ║                           ║
║  adendas_contratos                  ║   ║                          ║   ║  acciones_sistema         ║
║  ──────────────────────────────────║   ║  dias_disponibles        ║   ║  ─────────────────────── ║
║  id             SERIAL PK          ║   ║  ────────────────────────║   ║  id            SERIAL PK ║
║  contrato_id    FK contratos        ║   ║  id          SERIAL PK   ║   ║  usuario_email VARCHAR    ║
║  numero_adenda  INT NN              ║   ║  empleado_id INT UK+año  ║   ║  accion        VARCHAR    ║
║  descripcion    TEXT NN             ║   ║  anio        INT UK+emp  ║   ║  resultado     VARCHAR    ║
║  cambios_json   JSONB               ║   ║  dias_totales DECIMAL    ║   ║  ip_origen     VARCHAR    ║
║  fecha_vigencia DATE NN             ║   ║  dias_usados  DECIMAL    ║   ║  fecha         TIMESTAMP  ║
║  UNIQUE(contrato_id, numero_adenda) ║   ║  dias_pendientes DECIMAL ║   ╚═══════════════════════════╝
╚════════════════════════════════════╝   ║  dias_disp. GENERATED    ║
                                         ║                          ║
                                         ║  festivos                ║
                                         ║  ────────────────────────║
                                         ║  id    SERIAL PK         ║
                                         ║  fecha DATE UNIQUE       ║
                                         ║  descripcion VARCHAR     ║
                                         ║  anio  INT               ║
                                         ║  tipo  VARCHAR           ║
                                         ║  activo BOOLEAN          ║
                                         ╚══════════════════════════╝

╔═════════════════════════════════════════════╗    ╔══════════════════════════════╗
║  [Report Service] — SIN base de datos       ║    ║  AWS S3                      ║
║  Agrega via HTTP REST:                      ║    ║  hr-system-empleados         ║
║   → Employee: empleados + cargo actual      ║    ║  /fotos/                     ║
║   → Contract: contratos + adendas           ║    ║  /hojas-de-vida/             ║
║   → Vacation: días disponibles + solicitudes║    ║  /contratos-firmados/        ║
╚═════════════════════════════════════════════╝    ║  presigned URLs (privado)    ║
                                                   ╚══════════════════════════════╝
```

---

## 20. Estructura de Repositorios

### Repositorio Backend — `hr-system-backend`

```
hr-system-backend/
│
├── auth-service/                           ← Servicio 1: Auth (JWT + bcrypt + refresh tokens)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── auth.controller.js
│   │   ├── services/
│   │   │   ├── auth.service.js             ← login, logout, refresh
│   │   │   └── token.service.js            ← generación y verificación de JWT + refresh
│   │   ├── repositories/
│   │   │   ├── user.repository.js
│   │   │   └── refreshToken.repository.js  ← CRUD sobre refresh_tokens
│   │   ├── middlewares/
│   │   │   └── verifyToken.js
│   │   ├── routes/
│   │   │   └── auth.routes.js
│   │   └── index.js
│   ├── migrations/
│   │   ├── 001_create_usuarios.js
│   │   └── 002_create_refresh_tokens.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── employee-service/                       ← Servicio 2: Empleados + historial de carrera + S3
│   ├── src/
│   │   ├── controllers/
│   │   │   └── employee.controller.js
│   │   ├── services/
│   │   │   └── employee.service.js
│   │   ├── repositories/
│   │   │   ├── employee.repository.js
│   │   │   ├── cargoSalario.repository.js   ← CRUD sobre cargos_salarios
│   │   │   └── documento.repository.js      ← CRUD sobre documentos_empleado
│   │   ├── config/
│   │   │   └── s3.js                        ← presigned URLs subida y descarga
│   │   ├── middlewares/
│   │   │   └── verifyToken.js
│   │   └── routes/
│   │       └── employee.routes.js
│   ├── migrations/
│   │   ├── 001_create_empleados.js
│   │   ├── 002_create_cargos_salarios.js
│   │   └── 003_create_documentos_empleado.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── contract-service/                       ← Servicio 3: Contratos + adendas (valida REST)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── contract.controller.js
│   │   ├── services/
│   │   │   └── contract.service.js
│   │   ├── repositories/
│   │   │   ├── contract.repository.js
│   │   │   └── adenda.repository.js         ← CRUD sobre adendas_contratos
│   │   ├── clients/
│   │   │   └── employeeServiceClient.js     ← HTTP REST al Employee Service
│   │   ├── middlewares/
│   │   │   └── verifyToken.js
│   │   └── routes/
│   │       └── contract.routes.js
│   ├── migrations/
│   │   ├── 001_create_contratos.js
│   │   └── 002_create_adendas_contratos.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── vacation-service/                       ← Servicio 4: Vacaciones + días disponibles + festivos
│   ├── src/
│   │   ├── controllers/
│   │   │   └── vacation.controller.js
│   │   ├── services/
│   │   │   ├── vacation.service.js
│   │   │   ├── businessRules.service.js     ← 5 días hábiles, 1 mes anticipación, festivos
│   │   │   ├── diasDisponibles.service.js   ← lógica de cálculo y actualización
│   │   │   └── email.service.js             ← Nodemailer SMTP
│   │   ├── repositories/
│   │   │   ├── vacation.repository.js
│   │   │   ├── diasDisponibles.repository.js
│   │   │   └── festivos.repository.js       ← consultas a tabla festivos
│   │   ├── middlewares/
│   │   │   └── verifyToken.js
│   │   └── routes/
│   │       └── vacation.routes.js
│   ├── migrations/
│   │   ├── 001_create_festivos.js
│   │   ├── 002_create_vacaciones.js
│   │   ├── 003_create_dias_disponibles.js
│   │   └── 004_seed_festivos_2025.js        ← datos iniciales de festivos CO
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── report-service/                         ← Servicio 5: Reportes (SIN BD propia)
│   ├── src/
│   │   ├── controllers/
│   │   │   └── report.controller.js
│   │   ├── services/
│   │   │   └── report.service.js            ← agrega datos via HTTP REST
│   │   ├── clients/
│   │   │   ├── employeeServiceClient.js
│   │   │   ├── contractServiceClient.js
│   │   │   └── vacationServiceClient.js
│   │   ├── middlewares/
│   │   │   └── verifyToken.js
│   │   └── routes/
│   │       └── report.routes.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── history-service/                        ← Servicio 6: Historial + auditoría de seguridad
│   ├── src/
│   │   ├── controllers/
│   │   │   └── history.controller.js
│   │   ├── services/
│   │   │   └── history.service.js
│   │   ├── repositories/
│   │   │   ├── historialCambios.repository.js
│   │   │   └── accionesSistema.repository.js
│   │   ├── middlewares/
│   │   │   └── verifyToken.js
│   │   └── routes/
│   │       └── history.routes.js
│   ├── migrations/
│   │   ├── 001_create_historial_cambios.js
│   │   └── 002_create_acciones_sistema.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml                      ← Orquestación local (con volumes y healthchecks)
├── docker-compose.prod.yml                 ← Orquestación producción
│
├── .github/
│   └── workflows/
│       ├── ci-backend.yml                  ← Lint + pruebas unitarias en cada PR
│       └── deploy.yml                      ← Deploy automático
│
└── README.md
```

### Repositorio de Pruebas — `hr-system-tests`

```
hr-system-tests/
│
├── e2e/                                    ← Playwright — flujos completos
│   ├── auth.spec.ts                        ✅ Implementado por compañero
│   ├── employees.spec.ts
│   ├── contracts.spec.ts
│   ├── vacations.spec.ts
│   └── reports.spec.ts
│
├── integration/                            ← Playwright API Testing
│   ├── auth.api.spec.ts                    ✅ Implementado por compañero
│   ├── employees.api.spec.ts
│   ├── contracts.api.spec.ts
│   ├── vacations.api.spec.ts
│   └── history.api.spec.ts
│
├── performance/                            ← Grafana k6
│   ├── load/
│   │   ├── employees-load.js
│   │   ├── vacations-load.js
│   │   └── contracts-load.js
│   ├── stress/
│   │   ├── employees-stress.js
│   │   └── vacations-stress.js
│   └── results/                            ← JSONs generados por k6 (evidencia)
│
├── playwright.config.ts
├── package.json
└── README.md
```

### Repositorio Frontend — `hr-system-frontend`

```
hr-system-frontend/
│
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── employees/                      ← incluye vista de historial cargo/salario
│   │   ├── vacations/                      ← incluye indicador de días disponibles
│   │   ├── contracts/                      ← incluye sección de adendas
│   │   └── reports/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Employees.tsx
│   │   ├── EmployeeDetail.tsx
│   │   ├── Contracts.tsx
│   │   ├── Vacations.tsx
│   │   ├── Reports.tsx
│   │   └── AuditLog.tsx
│   ├── hooks/
│   │   ├── useAuth.ts                      ← maneja access + refresh token
│   │   └── useEmployees.ts
│   ├── services/
│   │   ├── auth.service.ts                 ← login, logout, refresh automático
│   │   ├── employee.service.ts
│   │   ├── contract.service.ts
│   │   ├── vacation.service.ts
│   │   └── report.service.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   └── utils/
│       └── api.ts                          ← Axios con interceptor para refresh automático
│
├── Dockerfile
├── .env.example
└── README.md
```

---

## 21. Seguridad

- Contraseñas hasheadas con **bcrypt** (salt rounds: 12). Nunca en texto plano.
- **JWT** firmado con secret ≥ 32 caracteres, expiración de 1 hora.
- **Refresh tokens** almacenados como hash SHA-256 en BD; nunca el token crudo.
- Logout real mediante `revocado = TRUE` en la tabla `refresh_tokens`.
- `logout-all` permite invalidar todas las sesiones activas de un usuario.
- Todos los endpoints protegidos con **Bearer Token**; solo `/login`, `/register` y `/refresh` son públicos.
- Middleware de autorización por **rol** en cada endpoint sensible.
- Archivos en S3 con acceso **privado** por defecto; lectura solo via **presigned URLs** (1h expiración).
- Política IAM con **mínimo privilegio**: solo `PutObject`, `GetObject`, `DeleteObject`.
- Variables sensibles exclusivamente en **archivos `.env`** (nunca en código).
- `.env` en `.gitignore`; `.env.example` como plantilla en el repo.
- **HTTPS obligatorio** en producción.
- **Volumes en Docker Compose** para persistir datos entre reinicios.
- **SonarCloud** analiza vulnerabilidades en cada Pull Request.
- Log de auditoría (`acciones_sistema`) registra todos los eventos de seguridad relevantes.

---

*Wiki — Sistema Administrador de Empleados · Versión 3.0 — Modelo profesional para uso empresarial*
*12 tablas · 6 microservicios · AWS S3 · Refresh Tokens · Festivos en BD · Días disponibles calculados*
