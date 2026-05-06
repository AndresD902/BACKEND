# 📋 Wiki — Sistema Administrador de Empleados

> Documentación completa del proyecto final · Versión 4.0 — Modelo de datos profesional con mejoras e implementaciones

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
| Control de acceso | Sin separación de roles ni validación de identidad del usuario |
| Sesiones de usuario | Sin control real de logout ni expiración de sesión |
| Reportes | Información dispersa, no confiable |
| Auditoría | Sin trazabilidad de qué cambió, quién lo cambió ni desde dónde |
| Administración multiempresa | Sin herramienta centralizada para gestionar múltiples empresas clientes |

### Solución Propuesta

Sistema web centralizado basado en **arquitectura de microservicios**, con modelo de datos robusto diseñado para uso empresarial real, control estricto por roles, trazabilidad completa, gestión de sesiones segura, cálculo automático de vacaciones disponibles y un nuevo microservicio de administración centralizada para escalar la solución a múltiples empresas.

---

## 2. Usuario Final

### Roles estándar por empresa

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Administrador** | Acceso total al sistema | CRUD completo en todos los módulos |
| **RRHH** | Gestión operativa de empleados | Registro, edición parcial, aprobación de vacaciones |
| **Consulta** | Solo lectura | Visualización de información y reportes. **Solo puede crearse si el usuario está registrado como empleado** (correo empresarial o personal) |

### Rol global

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Super Administrador** | Gestión centralizada de todas las empresas registradas en la plataforma | Administra empresas, asigna administradores, accede a auditoría global |

---

## 3. Caso de Uso Principal

```
1. [Super Admin] Registra empresa y asigna 2 administradores
       ↓
2. [Admin] Crea usuarios de RRHH y empleados (consultantes)
       ↓
3. [RRHH] Registra nuevo empleado
       ↓
4. [Sistema] Sube foto y CV a AWS S3 via presigned URL
       ↓
5. [RRHH] Asigna contrato laboral
       (Contract Service valida empleado via HTTP REST)
       ↓
6. [Sistema] Crea registro inicial en dias_disponibles para el año actual
       ↓
7. [RRHH] Solicita vacaciones para el empleado
       ↓
8. [Sistema] Valida: días hábiles, anticipación 1 mes, festivos CO, días disponibles
       ↓
9. [Sistema] Envía correo real a RRHH con detalles
       ↓
10. [RRHH] Aprueba o rechaza en 3 días hábiles
       ↓
11. [Sistema] Actualiza dias_disponibles; registra en History Service
       (qué empleado fue modificado, qué cambios se hicieron, quién los realizó)
       ↓
12. [Admin/RRHH] Genera reporte consolidado
```

### Casos de Uso por Servicio

| # | Servicio | Responsabilidad clave |
|---|----------|-----------------------|
| 1 | **Auth Service** | Hasheo bcrypt + JWT + refresh tokens + logout real + validación de correo real |
| 2 | **Employee Service** | Empleados + historial de cargo/salario + archivos en S3 + departamentos CO |
| 3 | **Contract Service** | Contratos + adendas + validación REST al Employee Service |
| 4 | **Vacation Service** | Solicitudes + días disponibles por año + festivos en BD + email + justificaciones de estado |
| 5 | **Report Service** | Agrega datos de 3 servicios via REST — sin BD propia |
| 6 | **History Service** | Trazabilidad completa: tipo de acción, empleado afectado, cambios, usuario responsable, IP, user agent |
| 7 | **Super Admin Service** *(nuevo)* | Registro de empresas, asignación de administradores, auditoría global |

---

## 4. Alcance del Proyecto

### ✅ Incluye (MVP v2)

- Autenticación con JWT + refresh tokens + logout real (revocación de tokens).
- **Validación de correo real al crear cuentas** (no se permiten correos inexistentes).
- Registro completo de empleados con historial de cargo y salario.
- **Preservación de datos del formulario de empleado** si la ventana se cierra accidentalmente.
- Almacenamiento de foto y CV en **AWS S3** (presigned URLs).
- **Subida temporal de documentos con aprobación de RRHH** antes de confirmar en S3.
- **Formato y límite de tamaño definido** para documentos (PDF/JPG/PNG, máx. 5 MB).
- Gestión de contratos con adendas y validación REST cruzada.
- Vacaciones con cálculo automático de días disponibles por año.
- **Lista de justificaciones para estado inactivo** (incapacidad, vacaciones, suspensión, etc.).
- **Estado "transición"** para empleados cuyo contrato está por finalizar pero puede renovarse.
- Festivos colombianos almacenados en BD (actualizables sin redesplegar).
- **Importación de JSON con departamentos de Colombia**.
- **Módulo de departamentos del cargo** accesible solo por administrador.
- Notificación por **correo real** a RRHH en cambios de empleados y solicitudes.
- **Correo a RRHH cuando los datos de un empleado son incorrectos**.
- Reportes consolidados sin BD propia.
- **Exportación CSV con formato estático y organizado** (cada campo en su celda).
- Trazabilidad de cambios con auditoría completa: tipo de acción, IP de origen, user agent.
- **Registros correctos de logout y logout-all** en el historial.
- Migraciones versionadas automáticas en Docker.
- Análisis de calidad con SonarCloud (cobertura mínima 60%).
- Pruebas E2E e integración con Playwright.
- Pruebas de carga y estrés con Grafana k6.
- **Super Admin Service**: administración centralizada multiempresa.

### ❌ No Incluye en MVP

- Módulo de nómina y liquidaciones.
- App móvil nativa.
- Portal de autoservicio para empleados.
- Firma digital de contratos.

### Supuestos Técnicos

- Los empleados **NO** son usuarios del sistema por defecto; son entidades gestionadas por Admin/RRHH. Un empleado puede tener rol "consulta" solo si está registrado con su correo empresarial o personal.
- Cada microservicio tiene su propia BD independiente; las relaciones entre servicios son **lógicas via REST**.
- Festivos colombianos se cargan como datos semilla (seed) al iniciar por primera vez.
- Los días de vacaciones legales son 15 días hábiles por año (Código Sustantivo del Trabajo Colombia).
- Las migraciones corren automáticamente al iniciar cada contenedor Docker.
- El estado **"transición"** indica que el contrato del empleado está próximo a vencer pero puede renovarse; es diferente a "inactivo" (ausentismo temporal) y "retirado" (desvinculado definitivamente).

---

## 5. Riesgos y Mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | Pérdida de datos en BD | Media | Alto | Backups automáticos diarios en servicio administrado |
| 2 | Token JWT comprometido | Baja | Alto | Refresh tokens + tabla `refresh_tokens` para revocación real |
| 3 | Sesión activa tras logout | Media | Alto | `refresh_tokens.revocado = true` al hacer logout; registrar en history |
| 4 | Inconsistencia en días disponibles | Media | Alto | Tabla `dias_disponibles` como fuente de verdad; actualización transaccional |
| 5 | Festivos hardcodeados desactualizados | Alta | Medio | Tabla `festivos` en BD; seed anual actualizable sin redespliegue |
| 6 | Fallo en comunicación entre microservicios | Media | Alto | Timeouts + reintentos + errores 503 controlados |
| 7 | Archivos S3 expuestos | Media | Alto | Objetos privados + presigned URLs con expiración |
| 8 | Deuda técnica acumulada | Alta | Medio | SonarCloud en cada PR + cobertura mínima 60% |
| 9 | Migración de BD falla en Docker | Media | Alto | `depends_on: condition: service_healthy` + migraciones idempotentes |
| 10 | Despliegue fallido en producción | Media | Alto | CI/CD con GitHub Actions + ambiente de staging |
| 11 | Creación de cuentas con correos inexistentes | Media | Alto | Validación de correo real al registrar (SMTP verify o servicio externo) |
| 12 | Pérdida de datos del formulario de empleado | Alta | Medio | Persistencia en localStorage mientras el formulario esté abierto |
| 13 | Documentos subidos sin control | Media | Alto | Flujo de aprobación RRHH antes de confirmar subida definitiva en S3 |
| 14 | Auditoría incompleta (sin IP, sin user agent) | Media | Alto | History Service captura siempre `ip_origen` y `user_agent` en cada registro |

---

## 6. Arquitectura del Sistema

### Tecnologías por Capa

| Capa | Tecnología | Justificación |
|------|-----------|--------------|
| **Frontend** | React + Vite + TailwindCSS | SPA moderna, componentes reutilizables |
| **Backend** | Node.js + Express | Liviano, ideal para microservicios REST |
| **Base de Datos** | PostgreSQL | Relacional, ACID, una instancia por servicio |
| **Migraciones** | node-pg-migrate | Versionado de esquema, idempotente en Docker |
| **Seeds** | Scripts SQL / node-pg-migrate | Datos iniciales (festivos, departamentos CO, configuración) |
| **Almacenamiento** | AWS S3 | Escalable para binarios (fotos, CVs, documentos) |
| **Autenticación** | JWT + Refresh Tokens | Stateless + logout real con revocación |
| **Notificaciones** | Nodemailer + SMTP | Correos reales para cambios de empleados, vacaciones, solicitudes de corrección |
| **Contenedores** | Docker + Docker Compose | Portabilidad y consistencia |
| **CI/CD** | GitHub Actions | Automatización de pruebas y despliegue |
| **Calidad** | SonarCloud | Análisis estático, cobertura mínima 60% |
| **Pruebas E2E** | Playwright | Flujos completos e integración de APIs |
| **Performance** | Grafana k6 | Pruebas de carga y estrés |
| **Despliegue** | Render / Railway / Vercel | PaaS con URL pública |

---

## 6.1 Documentación Interna de cada Microservicio

Esta sección detalla la lógica interna, responsabilidades, flujos y estructura de código de cada uno de los 7 microservicios del sistema. Es la guía de referencia antes de comenzar a programar.

---

### Microservicio 1 — Auth Service

**Puerto:** 3001 | **Base de datos:** `auth_db` | **Tablas:** `usuarios`, `refresh_tokens`

#### Responsabilidades
- Registrar usuarios con contraseña hasheada en bcrypt.
- **Validar que el correo electrónico es real** antes de completar el registro (verificación SMTP o servicio de validación externo). No se permite crear cuentas con correos inexistentes.
- Autenticar usuarios y emitir `access_token` (JWT, 1h) + `refresh_token` (opaco, 7 días).
- Renovar el `access_token` sin pedir contraseña nuevamente, usando el `refresh_token`.
- Revocar tokens en logout (individual y global) y **registrar correctamente ambas acciones en History Service**.
- **Permitir creación de usuario tipo "consulta" solo si el correo está registrado como empleado** (correo empresarial o personal).
- Proveer middleware `verifyToken` reutilizable por los demás servicios.

#### Reglas de negocio — Campos de usuario

| Campo | Regla |
|-------|-------|
| `celular` | Máximo **10 caracteres** |
| `salario` | Tope máximo de **100.000.000 COP** |
| `nivel_educativo` | Valores permitidos: `bachiller`, `tecnico`, `universitario`, `especialista`, `magister`, `doctorado` |
| `rol = consulta` | Solo se puede crear si el correo existe en `empleados.correo_personal` o `empleados.correo_corporativo` |

#### Flujo de Login
```
POST /api/auth/login
  1. Busca usuario por email en BD
  2. Verifica contraseña con bcrypt.compare()
  3. Genera access_token (JWT firmado con JWT_SECRET, exp: 1h)
  4. Genera refresh_token (crypto.randomBytes(64).toString('hex'))
  5. Guarda hash SHA-256 del refresh_token en tabla refresh_tokens (con ip_origen y user_agent)
  6. Actualiza usuarios.ultimo_login
  7. Registra acción 'login' en History Service con ip_origen y user_agent
  8. Retorna { access_token, refresh_token, usuario: { id, email, rol } }
```

#### Flujo de Refresh
```
POST /api/auth/refresh
  1. Recibe { refresh_token } en el body
  2. Calcula SHA-256 del token recibido
  3. Busca en refresh_tokens por token_hash
  4. Verifica: ¿existe? ¿revocado = false? ¿expires_at > ahora?
  5. Si todo OK → genera nuevo access_token
  6. Registra acción 'token_renovado' en History Service con ip_origen y user_agent
  7. Retorna { access_token }
  8. Si falla → 401 "Token inválido o revocado"
```

#### Flujo de Logout
```
POST /api/auth/logout
  1. Recibe { refresh_token } en el body
  2. Calcula SHA-256 del token
  3. Busca en refresh_tokens y marca revocado = TRUE
  4. Registra acción 'logout' en History Service con ip_origen y user_agent
  5. Retorna 200 { message: "Sesión cerrada correctamente" }

POST /api/auth/logout-all
  1. Extrae usuario_id del access_token (JWT)
  2. Marca revocado = TRUE en TODOS los refresh_tokens del usuario
  3. Registra acción 'logout_all' en History Service
  4. Útil cuando se sospecha de acceso no autorizado
```

#### Flujo de Registro con validación de correo real
```
POST /api/auth/register
  1. Valida campos (cedula, email, password, rol)
  2. Verifica que el email no exista en BD
  3. Verifica que el correo sea real (SMTP check o servicio de validación)
     → Si no existe: 400 "El correo electrónico no es válido o no existe"
  4. Si rol = 'consulta':
     → Verifica que el correo esté registrado en employee-service como empleado
     → Si no existe: 403 "El rol consulta requiere estar registrado como empleado"
  5. Hashea la contraseña con bcrypt (12 rounds)
  6. Crea el usuario en BD
  7. Retorna 201 con datos básicos del usuario
```

#### Estructura interna
```javascript
// src/services/auth.service.js
const bcrypt    = require('bcrypt');
const crypto    = require('crypto');
const jwt       = require('jsonwebtoken');
const userRepo  = require('../repositories/user.repository');
const tokenRepo = require('../repositories/refreshToken.repository');
const historyClient = require('../clients/historyServiceClient');
const employeeClient = require('../clients/employeeServiceClient');

const SALT_ROUNDS    = 12;
const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_DAYS   = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7');

const registrar = async ({ cedula, email, password, rol }) => {
  const existe = await userRepo.findByEmail(email);
  if (existe) throw { status: 409, message: 'El email ya está registrado' };

  // Validar que el correo sea real (servicio externo o SMTP check)
  const correoValido = await verificarCorreoReal(email);
  if (!correoValido) throw { status: 400, message: 'El correo electrónico no es válido o no existe' };

  // Si rol = consulta, verificar que el correo esté registrado como empleado
  if (rol === 'consulta') {
    const esEmpleado = await employeeClient.verificarCorreoEmpleado(email);
    if (!esEmpleado) throw { status: 403, message: 'El rol consulta requiere estar registrado como empleado' };
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return userRepo.create({ cedula, email, password: hash, rol });
};

const login = async ({ email, password }, ipOrigen, userAgent) => {
  const usuario = await userRepo.findByEmail(email);
  if (!usuario || !usuario.activo)
    throw { status: 401, message: 'Credenciales inválidas' };
  const valido = await bcrypt.compare(password, usuario.password);
  if (!valido) {
    // Registrar intento fallido
    historyClient.registrarAccion({
      usuario_email: email, accion: 'login', resultado: 'fallido',
      ip_origen: ipOrigen, user_agent: userAgent
    }).catch(() => {});
    throw { status: 401, message: 'Credenciales inválidas' };
  }

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

  // Registrar login exitoso en History Service
  historyClient.registrarAccion({
    usuario_email: usuario.email, rol: usuario.rol,
    accion: 'login', resultado: 'exitoso',
    ip_origen: ipOrigen, user_agent: userAgent
  }).catch(() => {});

  return { access_token: accessToken, refresh_token: refreshToken,
           usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol } };
};

const refresh = async (refreshToken, ipOrigen, userAgent) => {
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

  // Registrar renovación de token en History Service
  historyClient.registrarAccion({
    usuario_email: usuario.email, rol: usuario.rol,
    accion: 'token_renovado', resultado: 'exitoso',
    ip_origen: ipOrigen, user_agent: userAgent
  }).catch(() => {});

  return { access_token: accessToken };
};

const logout = async (refreshToken, ipOrigen, userAgent) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const registro  = await tokenRepo.findByHash(tokenHash);
  await tokenRepo.revocarPorHash(tokenHash);

  if (registro) {
    const usuario = await userRepo.findById(registro.usuario_id);
    historyClient.registrarAccion({
      usuario_email: usuario?.email, accion: 'logout', resultado: 'exitoso',
      ip_origen: ipOrigen, user_agent: userAgent
    }).catch(() => {});
  }
};

const logoutAll = async (usuarioId, ipOrigen, userAgent) => {
  await tokenRepo.revocarTodosPorUsuario(usuarioId);
  const usuario = await userRepo.findById(usuarioId);
  historyClient.registrarAccion({
    usuario_email: usuario?.email, accion: 'logout_all', resultado: 'exitoso',
    ip_origen: ipOrigen, user_agent: userAgent
  }).catch(() => {});
};

module.exports = { registrar, login, refresh, logout, logoutAll };
```

```javascript
// src/middlewares/verifyToken.js
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
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_gmail
```

---

### Microservicio 2 — Employee Service

**Puerto:** 3002 | **Base de datos:** `employee_db` | **Tablas:** `empleados`, `cargos_salarios`, `documentos_empleado`, `departamentos`

#### Responsabilidades
- Registrar y gestionar el ciclo de vida completo de los empleados.
- Mantener historial de cargos y salarios (promociones, aumentos).
- Gestionar documentos del empleado (foto, CV, certificados) via AWS S3 con **flujo de aprobación RRHH**.
- Notificar al History Service cuando se modifican datos sensibles, incluyendo **qué empleado fue modificado, qué campos cambiaron y quién realizó el cambio**.
- Enviar **correo real a RRHH** cuando se detectan datos incorrectos de un empleado.
- **Importar y gestionar departamentos de Colombia** desde JSON semilla.
- Proveer módulo de departamentos del cargo accesible solo por administrador.
- Validar JWT en cada operación mediante middleware local.

#### Estados de empleado

| Estado | Descripción |
|--------|-------------|
| `activo` | Trabajando actualmente |
| `inactivo` | Ausentismo temporal (ver lista de justificaciones abajo) |
| `transicion` | Contrato próximo a vencer, pendiente de renovación |
| `retirado` | Desvinculado definitivamente de la empresa |

#### Justificaciones para estado inactivo

Cuando un empleado pasa a estado `inactivo`, el sistema muestra una lista de justificaciones:
- Incapacidad médica
- Vacaciones aprobadas
- Suspensión disciplinaria
- Licencia de maternidad / paternidad
- Licencia no remunerada
- Calamidad doméstica
- Otro (especificar)

#### Flujo: Registrar nuevo empleado (con preservación de formulario)
```
POST /api/empleados
  1. Verifica JWT (middleware verifyToken → roles: admin, rrhh)
  2. El frontend guarda el estado del formulario en localStorage mientras el usuario llena datos.
     Si la ventana se cierra, los datos se restauran automáticamente al volver al formulario.
  3. Valida que la cédula no exista
  4. Crea registro en tabla empleados
  5. Si viene cargo y salario → crea registro en cargos_salarios con activo=TRUE
  6. Notifica a History Service: POST /api/historial/cambios
     (incluye: empleado_id afectado, tipo_accion='creacion_empleado',
      campos creados, usuario_modificador, ip_origen, user_agent)
  7. Retorna empleado creado con 201
```

#### Flujo: Cambiar cargo y salario
```
POST /api/empleados/:id/cargo
  1. Verifica JWT (roles: admin, rrhh)
  2. Busca cargo activo actual → UPDATE activo=FALSE, fecha_fin=hoy
  3. Crea nuevo registro en cargos_salarios con activo=TRUE, fecha_inicio=hoy
  4. Notifica a History Service con tipo_accion='cambio_cargo_salario',
     campo_modificado='cargo' y 'salario', ip_origen, user_agent
  5. Retorna nuevo cargo con 201
```

#### Flujo: Subir documento a S3 (con aprobación RRHH)
```
[Fase 1 — Subida temporal]
POST /api/empleados/:id/documentos/temporal
  1. Verifica JWT (roles: admin, rrhh)
  2. Valida formato: solo PDF, JPG, PNG
  3. Valida tamaño: máximo 5 MB
  4. Genera presigned URL de subida con AWS SDK (expira en 5 min), destino /temporal/
  5. Guarda registro en documentos_empleado con estado='pendiente_aprobacion'
  6. Envía correo real a RRHH notificando el documento pendiente

[Fase 2 — Aprobación RRHH]
PATCH /api/empleados/:id/documentos/:docId/aprobar
  1. Mueve el archivo de /temporal/ a la ruta definitiva en S3
  2. Actualiza documentos_empleado: estado='activo', s3_key y s3_url definitivos
  3. Notifica en History Service: tipo_accion='aprobacion_documento'

PATCH /api/empleados/:id/documentos/:docId/rechazar
  1. Elimina el archivo temporal de S3
  2. Actualiza documentos_empleado: estado='rechazado'
  3. Notifica al empleado con motivo de rechazo

[Descarga — sin cambios]
GET /api/empleados/documentos/:docId/url
  1. Busca el documento en documentos_empleado
  2. Genera presigned URL de descarga (expira en 1h)
  3. Retorna { url, expires_in: 3600 }
```

#### Flujo: Exportar empleados a CSV (formato organizado)
```
GET /api/empleados/export/csv
  1. Verifica JWT (roles: admin, rrhh)
  2. Obtiene lista de empleados con todos los campos
  3. Genera CSV con cabeceras fijas, cada campo en su columna correspondiente
     (sin mezcla de datos, sin columnas vacías, formato legible en Excel)
  4. Retorna archivo con Content-Disposition: attachment; filename="empleados_YYYY-MM-DD.csv"
```

#### Flujo: Solicitar corrección de datos
```
POST /api/empleados/:id/solicitar-correccion
  1. Verifica JWT (cualquier rol)
  2. Recibe { campo, descripcion_error, valor_incorrecto, valor_sugerido }
  3. Envía correo real a RRHH con los detalles de la corrección solicitada
  4. Registra en History Service: tipo_accion='solicitud_correccion'
  5. Retorna 200 { message: "Solicitud enviada a RRHH" }
```

#### Flujo: Filtros y búsqueda de empleados (corregidos)
```
GET /api/empleados?estado=activo&q=Juan&limit=50
  Filtros disponibles (todos corregidos y funcionales):
  - estado: activo | inactivo | transicion | retirado
  - q: búsqueda por nombre, apellido o cédula (máximo 50 caracteres)
  - departamento_id, cargo, fecha_ingreso_desde, fecha_ingreso_hasta
  - limit (máx. 100), offset
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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_gmail
RRHH_EMAIL=rrhh@empresa.com
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
  4. Crea registro en tabla contratos
  5. Notifica a History Service: tipo_accion='creacion_contrato'
  6. Retorna contrato creado con 201
```

#### Flujo: Agregar adenda
```
POST /api/contratos/:id/adendas
  1. Verifica JWT (roles: admin, rrhh)
  2. Verifica que el contrato existe y está activo
  3. Calcula numero_adenda = (COUNT de adendas existentes del contrato) + 1
  4. Construye cambios_json comparando valores anteriores vs nuevos
  5. Crea registro en adendas_contratos
  6. Notifica a History Service: tipo_accion='adenda_contrato'
  7. Retorna adenda creada con 201
```

#### Estructura interna — cliente REST al Employee Service
```javascript
// contract-service/src/clients/employeeServiceClient.js
const axios = require('axios');

const EMPLOYEE_URL = process.env.EMPLOYEE_SERVICE_URL;
const TIMEOUT_MS   = 5000;

const verificarEmpleado = async (empleadoId, token) => {
  try {
    const response = await axios.get(`${EMPLOYEE_URL}/api/empleados/${empleadoId}`, {
      headers:  { Authorization: `Bearer ${token}` },
      timeout:  TIMEOUT_MS
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404)
      throw { status: 404, message: `El empleado con id ${empleadoId} no existe en el sistema` };
    throw { status: 503, message: 'No se pudo verificar el empleado. Intente nuevamente.' };
  }
};

module.exports = { verificarEmpleado };
```

```javascript
// contract-service/src/services/contract.service.js
const contratoRepo   = require('../repositories/contract.repository');
const adendaRepo     = require('../repositories/adenda.repository');
const employeeClient = require('../clients/employeeServiceClient');
const historyClient  = require('../clients/historyServiceClient');

const crearContrato = async (datos, token, usuarioEmail) => {
  await employeeClient.verificarEmpleado(datos.empleado_id, token);

  const contrato = await contratoRepo.create({ ...datos, creadoPor: usuarioEmail });

  historyClient.registrarCambio({
    empleado_id:         datos.empleado_id,
    tipo_accion:         'creacion_contrato',
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

  const count        = await adendaRepo.countByContrato(contratoId);
  const numeroAdenda = count + 1;
  const adenda       = await adendaRepo.create({ contratoId, numeroAdenda, creadoPor: usuarioEmail, ...datos });

  historyClient.registrarCambio({
    empleado_id:         contrato.empleado_id,
    tipo_accion:         'adenda_contrato',
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
- Enviar notificaciones por **correo real** a RRHH al crear una solicitud.
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
  10. Envía correo real a RRHH con detalles de la solicitud (Nodemailer)
  11. UPDATE vacaciones: notificado=TRUE
  12. Registra en History Service: tipo_accion='solicitud_vacaciones'
  13. Retorna solicitud con 201
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
  5. Registra en History Service: tipo_accion='aprobacion_vacaciones'
  6. Envía correo de confirmación
  7. Retorna solicitud actualizada con 200
```

#### Flujo: Rechazar vacaciones
```
PATCH /api/vacaciones/:id/rechazar
  1. Verifica JWT (roles: admin, rrhh)
  2. Verifica que la solicitud esté en 'pendiente'
  3. UPDATE vacaciones: estado='rechazada', motivo_rechazo, aprobado_por
  4. UPDATE dias_disponibles: dias_pendientes -= dias_habiles
  5. Registra en History Service: tipo_accion='rechazo_vacaciones'
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
    const diaSemana   = cursor.getDay();
    const fechaStr    = cursor.toISOString().split('T')[0];
    const esFestivo   = fechasFestivos.has(fechaStr);
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    if (!esFestivo && !esFinSemana) diasHabiles++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return diasHabiles;
};

const validarAnticipacion = (fechaInicio) => {
  const hoy   = new Date();
  const unMes = new Date(hoy);
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
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
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
Si el Report Service tuviera su propia BD, tendría que sincronizarla constantemente con los demás servicios, creando duplicación de datos y riesgo de inconsistencias. Al agregar en tiempo real via REST, los reportes siempre muestran la información más actualizada.

#### Flujo: Reporte de estado laboral
```
GET /api/reportes/estado-laboral
  1. Verifica JWT
  2. GET http://employee-service/api/empleados?estado=activo
  3. Para cada empleado:
     GET http://employee-service/api/empleados/:id/cargo-actual
  4. GET http://vacation-service/api/vacaciones/empleado/:id/disponibles
  5. Combina y retorna lista consolidada
```

#### Flujo: Reporte completo de un empleado
```
GET /api/reportes/empleado/:id
  1. Verifica JWT (roles: admin, rrhh)
  2. En paralelo (Promise.allSettled):
     a. GET /employee-service/api/empleados/:id
     b. GET /employee-service/api/empleados/:id/historial-cargo
     c. GET /contract-service/api/contratos/empleado/:id
     d. GET /vacation-service/api/vacaciones/empleado/:id
     e. GET /vacation-service/api/vacaciones/empleado/:id/disponibles
  3. Consolida todos los datos en un único objeto de respuesta
  4. Si alguna llamada falla, incluye el campo con null y agrega advertencia
```

#### Manejo de fallos parciales
```javascript
// report-service/src/services/report.service.js
const obtenerReporteEmpleado = async (empleadoId, token) => {
  const headers = { Authorization: `Bearer ${token}` };

  const [empleado, historialCargo, contratos, vacaciones, disponibles] =
    await Promise.allSettled([
      axios.get(`${EMPLOYEE_URL}/api/empleados/${empleadoId}`,                { headers }),
      axios.get(`${EMPLOYEE_URL}/api/empleados/${empleadoId}/historial-cargo`, { headers }),
      axios.get(`${CONTRACT_URL}/api/contratos/empleado/${empleadoId}`,        { headers }),
      axios.get(`${VACATION_URL}/api/vacaciones/empleado/${empleadoId}`,       { headers }),
      axios.get(`${VACATION_URL}/api/vacaciones/empleado/${empleadoId}/disponibles`, { headers }),
    ]);

  const advertencias = [];
  const extraer = (resultado, nombre) => {
    if (resultado.status === 'fulfilled') return resultado.value.data;
    advertencias.push(`No se pudo obtener ${nombre}: ${resultado.reason?.message}`);
    return null;
  };

  return {
    empleado:        extraer(empleado,       'datos del empleado'),
    historial_cargo: extraer(historialCargo, 'historial de cargos'),
    contratos:       extraer(contratos,      'contratos'),
    vacaciones:      extraer(vacaciones,     'vacaciones'),
    disponibles:     extraer(disponibles,    'días disponibles'),
    advertencias,
    generado_en:     new Date().toISOString(),
  };
};
```

#### Reportes disponibles

| Endpoint | Servicios consultados | Datos combinados |
|----------|----------------------|-----------------|
| `GET /estado-laboral` | Employee + Vacation | Empleados activos con cargo actual y días disponibles |
| `GET /vacaciones` | Vacation + Employee | Resumen de solicitudes por estado y empleado |
| `GET /contratos` | Contract + Employee | Contratos agrupados por tipo y estado |
| `GET /empleado/:id` | Employee + Contract + Vacation | Ficha completa del empleado |
| `GET /turnover` | Employee + Contract | Empleados retirados en un rango de fechas |

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
- Registrar acciones de seguridad del sistema (login, logout, logout-all, token renovado, reportes generados).
- **Especificar el tipo de acción en cada registro** (catálogo completo abajo).
- **Incluir siempre `ip_origen` y `user_agent`** en todos los registros relevantes.
- **Registrar correctamente logout y logout-all** como acciones diferenciadas.
- Proveer endpoints de consulta para auditoría, filtrados por empleado, usuario, entidad, tipo de acción y rango de fechas.
- Ser un servicio **pasivo**: no llama a ningún otro servicio, solo recibe y almacena.

#### Catálogo de tipos de acción

| Tipo de acción | Disparado por |
|---------------|--------------|
| `login` | Auth Service |
| `logout` | Auth Service |
| `logout_all` | Auth Service |
| `token_renovado` | Auth Service |
| `creacion_empleado` | Employee Service |
| `modificacion_empleado` | Employee Service |
| `cambio_cargo_salario` | Employee Service |
| `subida_documento` | Employee Service |
| `aprobacion_documento` | Employee Service |
| `solicitud_correccion` | Employee Service |
| `creacion_contrato` | Contract Service |
| `adenda_contrato` | Contract Service |
| `solicitud_vacaciones` | Vacation Service |
| `aprobacion_vacaciones` | Vacation Service |
| `rechazo_vacaciones` | Vacation Service |
| `reporte_generado` | Report Service |

#### ¿Quién llama al History Service?
```
Employee Service  → POST /api/historial/cambios  (al crear/editar empleado, al cambiar cargo)
Contract Service  → POST /api/historial/cambios  (al crear contrato, al agregar adenda)
Vacation Service  → POST /api/historial/cambios  (al aprobar/rechazar vacaciones)
Auth Service      → POST /api/historial/acciones (al hacer login, logout, logout-all, refresh)
Report Service    → POST /api/historial/acciones (al generar reportes)
```

#### Flujo: Registrar cambio de campo
```
POST /api/historial/cambios
Body: {
  empleado_id, tipo_accion, entidad, entidad_id,
  campo_modificado, valor_anterior, valor_nuevo,
  usuario_modificador, rol_modificador, ip_origen, user_agent
}
  1. Valida que los campos requeridos estén presentes
  2. Inserta en historial_cambios
  3. Retorna 201 { id, fecha_modificacion }
```

#### Flujo: Registrar acción del sistema
```
POST /api/historial/acciones
Body: {
  usuario_email, rol, tipo_accion, entidad, entidad_id,
  resultado, detalle, ip_origen, user_agent
}
  1. Inserta en acciones_sistema
  2. Retorna 201 { id, fecha }
```

#### Estructura interna
```javascript
// history-service/src/services/history.service.js
const historialRepo = require('../repositories/historialCambios.repository');
const accionesRepo  = require('../repositories/accionesSistema.repository');

const registrarCambio = async (datos) => {
  const { empleado_id, tipo_accion, entidad, entidad_id, campo_modificado,
          valor_anterior, valor_nuevo, usuario_modificador,
          rol_modificador, ip_origen, user_agent } = datos;

  if (!empleado_id || !entidad || !campo_modificado || !usuario_modificador || !tipo_accion)
    throw { status: 400, message: 'Campos requeridos: empleado_id, tipo_accion, entidad, campo_modificado, usuario_modificador' };

  return historialRepo.create({
    empleado_id, tipo_accion, entidad, entidad_id, campo_modificado,
    valor_anterior: valor_anterior?.toString() ?? null,
    valor_nuevo:    valor_nuevo?.toString()    ?? null,
    usuario_modificador, rol_modificador, ip_origen, user_agent
  });
};

const registrarAccion = async (datos) => {
  const { usuario_email, rol, tipo_accion, entidad, entidad_id,
          resultado = 'exitoso', detalle, ip_origen, user_agent } = datos;

  if (!tipo_accion) throw { status: 400, message: 'Campo requerido: tipo_accion' };

  return accionesRepo.create({
    usuario_email, rol, tipo_accion, entidad, entidad_id,
    resultado, detalle, ip_origen, user_agent
  });
};

const obtenerCambiosPorEmpleado = async (empleadoId, filtros = {}) => {
  const { tipo_accion, entidad, entidad_id, desde, hasta, limit = 50, offset = 0 } = filtros;
  return historialRepo.findByEmpleado(empleadoId, { tipo_accion, entidad, entidad_id, desde, hasta, limit, offset });
};

const obtenerAcciones = async (filtros = {}) => {
  const { tipo_accion, resultado, usuario_email, desde, hasta, limit = 50, offset = 0 } = filtros;
  return accionesRepo.findAll({ tipo_accion, resultado, usuario_email, desde, hasta, limit, offset });
};

module.exports = { registrarCambio, registrarAccion, obtenerCambiosPorEmpleado, obtenerAcciones };
```

```javascript
// Cliente reutilizable que usan los demás servicios para notificar al History Service
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
SELECT usuario_modificador, rol_modificador, valor_anterior, valor_nuevo, ip_origen, fecha_modificacion
FROM historial_cambios
WHERE empleado_id = $1 AND campo_modificado = 'salario'
ORDER BY fecha_modificacion DESC;

-- Intentos de login fallidos en las últimas 24 horas
SELECT usuario_email, ip_origen, user_agent, COUNT(*) as intentos, MAX(fecha) as ultimo_intento
FROM acciones_sistema
WHERE tipo_accion = 'login'
  AND resultado = 'fallido'
  AND fecha >= NOW() - INTERVAL '24 hours'
GROUP BY usuario_email, ip_origen, user_agent
ORDER BY intentos DESC;

-- Todos los logout y logout-all del último mes
SELECT usuario_email, tipo_accion, ip_origen, fecha
FROM acciones_sistema
WHERE tipo_accion IN ('logout', 'logout_all')
  AND fecha >= NOW() - INTERVAL '30 days'
ORDER BY fecha DESC;

-- Resumen de actividad del sistema por usuario en el último mes
SELECT usuario_email, rol, tipo_accion, COUNT(*) as total
FROM acciones_sistema
WHERE fecha >= NOW() - INTERVAL '30 days'
GROUP BY usuario_email, rol, tipo_accion
ORDER BY total DESC;
```

#### Variables de entorno
```env
PORT=3006
DATABASE_URL=postgres://postgres:password@postgres-history:5432/history_db
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui
```

---

### Microservicio 7 — Super Admin Service *(nuevo)*

**Puerto:** 3007 | **Base de datos:** `superadmin_db` | **Tablas:** `super_admins`, `empresas`, `admins_empresa`, `refresh_tokens_superadmin`

#### Responsabilidades
- Gestionar el registro, login y recuperación de contraseña del super administrador.
- Administrar empresas registradas en la plataforma (alta, baja, edición).
- Asignar hasta **2 administradores por empresa** que actúan como soporte técnico para problemas con microservicios.
- Crear usuarios de RRHH y empleados (consultantes) en nombre de las empresas.
- Acceder a información de auditoría global: logins, renovaciones de token, logout, creación de empleados, cambios de datos, solicitudes de vacaciones, subida de documentos, consultas de contrato.
- Proveer dashboard y lista de empleados con **detalles de estado**.

#### Rol único

| Rol | Descripción |
|-----|-------------|
| `super_admin` | Rol único del microservicio. No puede existir otro tipo de rol aquí. |

#### Detalle de estados en lista de empleados

| Estado | Descripción visible |
|--------|---------------------|
| `activo` | Trabajando actualmente |
| `inactivo` | Ausentismo temporal (incapacidad, suspensión, vacaciones, etc.) |
| `transicion` | Contrato próximo a vencer, en proceso de renovación |
| `retirado` | Ya no forma parte de la empresa |

#### Flujo: Registro y acceso de super administrador
```
POST /api/super-admin/register
  1. Solo accesible desde entorno seguro (endpoint protegido por IP o CLI)
  2. Crea el super_admin con contraseña hasheada en bcrypt
  3. Envía correo de confirmación

POST /api/super-admin/login
  1. Autenticación igual al Auth Service (bcrypt + JWT + refresh_token)
  2. Registra login con ip_origen y user_agent

POST /api/super-admin/recover-password
  1. Recibe email del super admin
  2. Genera token temporal y envía correo con enlace de recuperación
```

#### Flujo: Administración de empresas
```
POST /api/super-admin/empresas
  1. Registra nueva empresa con datos básicos (nombre, NIT, correo, plan)
  2. Crea 2 administradores asignados a la empresa (correo + contraseña temporal)
  3. Notifica a los administradores por correo con credenciales iniciales

GET /api/super-admin/empresas
  1. Lista todas las empresas con estado, número de empleados y admins asignados

POST /api/super-admin/empresas/:id/admins
  1. Agrega o reemplaza uno de los 2 administradores de la empresa
```

#### Flujo: Creación de usuarios en nombre de una empresa
```
POST /api/super-admin/empresas/:id/usuarios
  1. Crea usuario RRHH o consulta para la empresa indicada
  2. Llama al Auth Service de esa empresa via REST para registrar el usuario
  3. Registra la acción en historial de auditoría
```

#### Flujo: Auditoría global
```
GET /api/super-admin/auditoria
  1. Verifica JWT con rol super_admin
  2. Llama al History Service para obtener el log global
  3. Filtra por: empresa, tipo_accion, rango de fechas, usuario_email
  4. Retorna lista paginada con todos los eventos
  Tipos accesibles: login, logout, logout_all, token_renovado,
  creacion_empleado, modificacion_empleado, aprobacion_vacaciones,
  subida_documento, consulta_contrato, etc.
```

#### Estructura interna
```javascript
// super-admin-service/src/services/empresa.service.js
const empresaRepo     = require('../repositories/empresa.repository');
const adminRepo       = require('../repositories/adminEmpresa.repository');
const authClient      = require('../clients/authServiceClient');
const employeeClient  = require('../clients/employeeServiceClient');
const historyClient   = require('../clients/historyServiceClient');
const emailService    = require('./email.service');
const bcrypt          = require('bcrypt');
const crypto          = require('crypto');

const crearEmpresa = async ({ nombre, nit, correo, plan }, superAdminEmail) => {
  const existente = await empresaRepo.findByNit(nit);
  if (existente) throw { status: 409, message: 'Ya existe una empresa con ese NIT' };

  const empresa = await empresaRepo.create({ nombre, nit, correo, plan });

  // Crear 2 administradores con contraseña temporal
  const admins = [];
  for (let i = 1; i <= 2; i++) {
    const passwordTemporal = crypto.randomBytes(8).toString('hex');
    const adminEmail = `admin${i}.${nit.toLowerCase()}@${correo.split('@')[1]}`;

    await authClient.registrarUsuario({
      email: adminEmail, password: passwordTemporal, rol: 'admin', cedula: `ADMIN${nit}${i}`
    });

    await adminRepo.create({ empresa_id: empresa.id, email: adminEmail, nombre: `Administrador ${i}` });

    // Enviar credenciales al correo de la empresa
    await emailService.enviarCredencialesAdmin({
      to: correo, adminEmail, passwordTemporal, nombreEmpresa: nombre
    });

    admins.push({ email: adminEmail });
  }

  return { empresa, admins };
};

const obtenerEmpleadosConEstado = async (empresaId, token) => {
  const empleados = await employeeClient.listarEmpleados(token);
  return empleados.map(emp => ({
    ...emp,
    detalle_estado: {
      activo:     'Trabajando actualmente',
      inactivo:   `Ausentismo temporal${emp.justificacion_inactivo ? ': ' + emp.justificacion_inactivo : ''}`,
      transicion: 'Contrato próximo a vencer, en proceso de renovación',
      retirado:   'Ya no forma parte de la empresa',
    }[emp.estado] || emp.estado
  }));
};

module.exports = { crearEmpresa, obtenerEmpleadosConEstado };
```

#### Variables de entorno
```env
PORT=3007
DATABASE_URL=postgres://postgres:password@postgres-superadmin:5432/superadmin_db
JWT_SECRET=minimo_32_caracteres_superadmin_aqui
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7
AUTH_SERVICE_URL=http://auth-service:3001
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_gmail
```

---

### Comunicación entre microservicios — Resumen visual

```
Super Admin Service (3007)
  └─→ Auth Service:     crea usuarios para empresas
  └─→ Employee Service: consulta lista de empleados y estados
  └─→ History Service:  consulta auditoría global

Auth Service (3001)
  └─→ History Service:  registra login, logout, logout_all, token_renovado
  └─→ Employee Service: verifica si correo existe como empleado (para rol consulta)

Employee Service (3002)
  └─→ History Service:  registra cambios (tipo_accion, empleado_id, quién, ip, user_agent)
  └─→ AWS S3:           sube/descarga archivos via presigned URL
  └─→ SMTP:             correos a RRHH por datos incorrectos o documentos pendientes

Contract Service (3003)
  └─→ Employee Service: verifica que el empleado existe (GET)
  └─→ History Service:  registra creación de contrato y adendas

Vacation Service (3004)
  └─→ Employee Service: verifica que el empleado existe (GET)
  └─→ History Service:  registra solicitud, aprobación/rechazo de vacaciones
  └─→ SMTP:             envía correos reales a RRHH

Report Service (3005)
  └─→ Employee Service: obtiene empleados, cargos (GET)
  └─→ Contract Service: obtiene contratos (GET)
  └─→ Vacation Service: obtiene vacaciones y disponibles (GET)
  └─→ History Service:  registra generación de reportes (acción)

History Service (3006)
  └─→ No llama a ningún otro servicio (solo recibe y almacena)
```

---

## 7. Modelo de Datos Completo — por Microservicio

---

### 7.1 Auth Service — `DB Auth`

```sql
-- Tabla 1: Usuarios del sistema
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    cedula          VARCHAR(20)  UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(200) NOT NULL,
    rol             VARCHAR(50)  NOT NULL
                    CHECK (rol IN ('admin', 'rrhh', 'consulta')),
    celular         VARCHAR(10),                    -- máximo 10 caracteres
    salario         DECIMAL(12,2)
                    CHECK (salario IS NULL OR salario <= 100000000), -- tope 100M COP
    nivel_educativo VARCHAR(50)
                    CHECK (nivel_educativo IN ('bachiller','tecnico','universitario',
                                               'especialista','magister','doctorado')),
    activo          BOOLEAN DEFAULT TRUE,
    ultimo_login    TIMESTAMP,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Refresh tokens (logout real y renovación de sesión)
CREATE TABLE refresh_tokens (
    id              SERIAL PRIMARY KEY,
    usuario_id      INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    revocado        BOOLEAN DEFAULT FALSE,
    ip_origen       VARCHAR(45),
    user_agent      TEXT,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_revocado   ON refresh_tokens(revocado, expires_at);
```

---

### 7.2 Employee Service — `DB Employee`

```sql
-- Tabla 0: Departamentos de Colombia (importados desde JSON semilla)
CREATE TABLE departamentos (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    codigo_dane VARCHAR(10),
    activo      BOOLEAN DEFAULT TRUE
);

-- Tabla 1: Datos de identidad del empleado
CREATE TABLE empleados (
    id                     SERIAL PRIMARY KEY,
    nombre                 VARCHAR(100) NOT NULL,
    apellido               VARCHAR(100) NOT NULL,
    cedula                 VARCHAR(20)  UNIQUE NOT NULL,
    tipo_documento         VARCHAR(30)  DEFAULT 'cedula_ciudadania'
                           CHECK (tipo_documento IN ('cedula_ciudadania', 'cedula_extranjeria',
                                                      'pasaporte', 'tarjeta_identidad')),
    genero                 VARCHAR(20)  CHECK (genero IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir')),
    fecha_nacimiento       DATE,
    celular                VARCHAR(10),                  -- máximo 10 caracteres
    telefono_fijo          VARCHAR(20),
    correo_personal        VARCHAR(150),
    correo_corporativo     VARCHAR(150),
    direccion              TEXT,
    ciudad                 VARCHAR(100),
    departamento_id        INT REFERENCES departamentos(id),  -- referencia a tabla departamentos CO
    nivel_educativo        VARCHAR(50)
                           CHECK (nivel_educativo IN ('bachiller','tecnico','universitario',
                                                       'especialista','magister','doctorado')),
    estado                 VARCHAR(20) DEFAULT 'activo'
                           CHECK (estado IN ('activo', 'inactivo', 'transicion', 'retirado')),
    justificacion_inactivo VARCHAR(100),                 -- requerido cuando estado = 'inactivo'
    fecha_ingreso          DATE,
    fecha_retiro           DATE,
    fecha_creacion         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Historial de cargo y salario
CREATE TABLE cargos_salarios (
    id              SERIAL PRIMARY KEY,
    empleado_id     INT NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
    cargo           VARCHAR(100) NOT NULL,
    departamento_id INT REFERENCES departamentos(id),
    salario         DECIMAL(12,2) NOT NULL
                    CHECK (salario <= 100000000),        -- tope 100M COP
    tipo_salario    VARCHAR(30) DEFAULT 'fijo'
                    CHECK (tipo_salario IN ('fijo', 'variable', 'por_hora')),
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE,
    activo          BOOLEAN DEFAULT TRUE,
    motivo_cambio   TEXT,
    registrado_por  VARCHAR(150),
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: Documentos del empleado (con flujo de aprobación RRHH)
CREATE TABLE documentos_empleado (
    id              SERIAL PRIMARY KEY,
    empleado_id     INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    tipo            VARCHAR(50) NOT NULL
                    CHECK (tipo IN ('foto', 'hoja_vida', 'certificado', 'diploma',
                                    'contrato_firmado', 'otro')),
    nombre_archivo  VARCHAR(255),
    s3_key          TEXT NOT NULL,
    s3_url          TEXT NOT NULL,
    mime_type       VARCHAR(100)
                    CHECK (mime_type IN ('image/jpeg','image/png','application/pdf')),
    tamano_bytes    BIGINT CHECK (tamano_bytes <= 5242880),  -- máximo 5 MB
    estado          VARCHAR(30) DEFAULT 'pendiente_aprobacion'
                    CHECK (estado IN ('pendiente_aprobacion', 'activo', 'rechazado')),
    motivo_rechazo  TEXT,
    aprobado_por    VARCHAR(150),
    subido_por      VARCHAR(150),
    fecha_subida    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_empleados_cedula         ON empleados(cedula);
CREATE INDEX idx_empleados_estado         ON empleados(estado);
CREATE INDEX idx_cargos_salarios_emp      ON cargos_salarios(empleado_id, activo);
CREATE INDEX idx_documentos_empleado_tipo ON documentos_empleado(empleado_id, tipo, estado);
```

**Consulta: cargo y salario actual de un empleado**
```sql
SELECT cargo, departamento_id, salario, fecha_inicio
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

```sql
CREATE TABLE contratos (
    id                  SERIAL PRIMARY KEY,
    empleado_id         INT NOT NULL,
    tipo                VARCHAR(50) NOT NULL
                        CHECK (tipo IN ('indefinido', 'fijo', 'obra_labor',
                                        'aprendizaje', 'prestacion_servicios')),
    salario             DECIMAL(12,2) NOT NULL
                        CHECK (salario <= 100000000),
    moneda              VARCHAR(10) DEFAULT 'COP',
    fecha_inicio        DATE NOT NULL,
    fecha_fin           DATE,
    metodo_pago         VARCHAR(50) CHECK (metodo_pago IN ('transferencia', 'cheque', 'efectivo')),
    periodicidad_pago   VARCHAR(50) CHECK (periodicidad_pago IN ('mensual', 'quincenal', 'semanal')),
    lugar_trabajo       VARCHAR(150),
    modalidad           VARCHAR(50) DEFAULT 'presencial'
                        CHECK (modalidad IN ('presencial', 'remoto', 'hibrido')),
    jornada             VARCHAR(50) DEFAULT 'completa'
                        CHECK (jornada IN ('completa', 'medio_tiempo', 'flexible')),
    archivo_s3_key      TEXT,
    archivo_s3_url      TEXT,
    estado              VARCHAR(20) DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'vencido', 'terminado', 'suspendido')),
    creado_por          VARCHAR(150),
    fecha_creacion      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adendas_contratos (
    id              SERIAL PRIMARY KEY,
    contrato_id     INT NOT NULL REFERENCES contratos(id) ON DELETE RESTRICT,
    numero_adenda   INT NOT NULL,
    descripcion     TEXT NOT NULL,
    cambios_json    JSONB,
    archivo_s3_key  TEXT,
    archivo_s3_url  TEXT,
    fecha_vigencia  DATE NOT NULL,
    creado_por      VARCHAR(150),
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (contrato_id, numero_adenda)
);

CREATE INDEX idx_contratos_empleado_id ON contratos(empleado_id, estado);
CREATE INDEX idx_adendas_contrato_id   ON adendas_contratos(contrato_id);
```

---

### 7.4 Vacation Service — `DB Vacation`

```sql
CREATE TABLE vacaciones (
    id               SERIAL PRIMARY KEY,
    empleado_id      INT NOT NULL,
    fecha_inicio     DATE NOT NULL,
    fecha_fin        DATE NOT NULL,
    dias_habiles     INT NOT NULL,
    dias_calendario  INT NOT NULL,
    estado           VARCHAR(20) DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
    justificacion    TEXT,
    motivo_rechazo   TEXT,
    aprobado_por     VARCHAR(150),
    fecha_aprobacion TIMESTAMP,
    notificado       BOOLEAN DEFAULT FALSE,
    fecha_solicitud  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dias_disponibles (
    id               SERIAL PRIMARY KEY,
    empleado_id      INT NOT NULL,
    anio             INT NOT NULL,
    dias_totales     DECIMAL(5,1) NOT NULL,
    dias_usados      DECIMAL(5,1) DEFAULT 0,
    dias_pendientes  DECIMAL(5,1) DEFAULT 0,
    dias_disponibles DECIMAL(5,1) GENERATED ALWAYS AS
                     (dias_totales - dias_usados - dias_pendientes) STORED,
    fecha_creacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (empleado_id, anio)
);

CREATE TABLE festivos (
    id          SERIAL PRIMARY KEY,
    fecha       DATE NOT NULL UNIQUE,
    descripcion VARCHAR(150) NOT NULL,
    anio        INT NOT NULL,
    tipo        VARCHAR(50) DEFAULT 'nacional'
                CHECK (tipo IN ('nacional', 'regional', 'empresarial')),
    activo      BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_vacaciones_empleado_estado ON vacaciones(empleado_id, estado);
CREATE INDEX idx_vacaciones_fechas          ON vacaciones(fecha_inicio, fecha_fin);
CREATE INDEX idx_dias_disponibles_emp_anio  ON dias_disponibles(empleado_id, anio);
CREATE INDEX idx_festivos_fecha             ON festivos(fecha, activo);
CREATE INDEX idx_festivos_anio              ON festivos(anio, activo);
```

**Seed de festivos colombianos 2025:**
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

```sql
-- Tabla 1: Historial detallado de cambios
CREATE TABLE historial_cambios (
    id                   SERIAL PRIMARY KEY,
    empleado_id          INT NOT NULL,
    tipo_accion          VARCHAR(100) NOT NULL,     -- ver catálogo en sección 6.1
    entidad              VARCHAR(50) NOT NULL,
    entidad_id           INT,
    campo_modificado     VARCHAR(100) NOT NULL,
    valor_anterior       TEXT,
    valor_nuevo          TEXT,
    usuario_modificador  VARCHAR(150) NOT NULL,
    rol_modificador      VARCHAR(50),
    ip_origen            VARCHAR(45),               -- siempre requerido
    user_agent           TEXT,                      -- siempre requerido
    fecha_modificacion   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Log de acciones generales del sistema
CREATE TABLE acciones_sistema (
    id              SERIAL PRIMARY KEY,
    usuario_email   VARCHAR(150),
    rol             VARCHAR(50),
    tipo_accion     VARCHAR(100) NOT NULL,           -- ver catálogo en sección 6.1
    entidad         VARCHAR(50),
    entidad_id      INT,
    resultado       VARCHAR(20) DEFAULT 'exitoso'
                    CHECK (resultado IN ('exitoso', 'fallido', 'denegado')),
    detalle         TEXT,
    ip_origen       VARCHAR(45),                     -- siempre requerido
    user_agent      TEXT,                            -- siempre requerido
    fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historial_empleado_id ON historial_cambios(empleado_id, fecha_modificacion DESC);
CREATE INDEX idx_historial_tipo_accion  ON historial_cambios(tipo_accion);
CREATE INDEX idx_historial_entidad      ON historial_cambios(entidad, entidad_id);
CREATE INDEX idx_historial_usuario      ON historial_cambios(usuario_modificador);
CREATE INDEX idx_acciones_usuario       ON acciones_sistema(usuario_email, fecha DESC);
CREATE INDEX idx_acciones_tipo          ON acciones_sistema(tipo_accion, resultado);
```

---

### 7.6 Report Service — Sin base de datos

El Report Service **no tiene base de datos propia**. Agrega datos en tiempo real via REST desde Employee, Contract y Vacation Services.

---

### 7.7 Super Admin Service — `DB Super Admin`

```sql
-- Tabla 1: Super administradores de la plataforma
CREATE TABLE super_admins (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(200) NOT NULL,
    nombre          VARCHAR(150),
    activo          BOOLEAN DEFAULT TRUE,
    ultimo_login    TIMESTAMP,
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Empresas registradas en la plataforma
CREATE TABLE empresas (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL,
    nit             VARCHAR(20)  UNIQUE NOT NULL,
    correo          VARCHAR(150),
    plan            VARCHAR(50)  DEFAULT 'basico'
                    CHECK (plan IN ('basico', 'profesional', 'empresarial')),
    activa          BOOLEAN DEFAULT TRUE,
    fecha_registro  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: Administradores asignados a cada empresa (máximo 2 por empresa)
CREATE TABLE admins_empresa (
    id               SERIAL PRIMARY KEY,
    empresa_id       INT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    email            VARCHAR(150) NOT NULL,
    nombre           VARCHAR(150),
    activo           BOOLEAN DEFAULT TRUE,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (empresa_id, email)
);

-- Tabla 4: Refresh tokens del super admin
CREATE TABLE refresh_tokens_superadmin (
    id             SERIAL PRIMARY KEY,
    super_admin_id INT NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
    token_hash     VARCHAR(255) UNIQUE NOT NULL,
    expires_at     TIMESTAMP NOT NULL,
    revocado       BOOLEAN DEFAULT FALSE,
    ip_origen      VARCHAR(45),
    user_agent     TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_empresa_id ON admins_empresa(empresa_id);
```

---

### Resumen del Modelo de Datos

| Servicio | Tablas | Propósito |
|----------|--------|-----------|
| **Auth** | `usuarios`, `refresh_tokens` | Identidad + sesiones seguras + validación de correo real |
| **Employee** | `empleados`, `cargos_salarios`, `documentos_empleado`, `departamentos` | Datos + carrera + archivos con aprobación + departamentos CO |
| **Contract** | `contratos`, `adendas_contratos` | Contratos + modificaciones con trazabilidad legal |
| **Vacation** | `vacaciones`, `dias_disponibles`, `festivos` | Solicitudes + disponibilidad + festivos en BD |
| **History** | `historial_cambios`, `acciones_sistema` | Auditoría con tipo_accion, IP y user agent |
| **Report** | — | Agrega via REST, sin BD propia |
| **Super Admin** | `super_admins`, `empresas`, `admins_empresa`, `refresh_tokens_superadmin` | Administración centralizada multiempresa |
| **Total** | **17 tablas** | Modelo profesional para uso empresarial real multiempresa |

---

## 8. Migraciones de Base de Datos

Las migraciones garantizan que el esquema se cree y actualice de forma **automática y versionada** al iniciar Docker. Son idempotentes: si ya se ejecutaron, no vuelven a correr.

### Estructura de migraciones por servicio

```
auth-service/migrations/
├── 001_create_usuarios.js
└── 002_create_refresh_tokens.js

employee-service/migrations/
├── 001_create_departamentos.js
├── 002_seed_departamentos_colombia.js     ← JSON con 32 departamentos de Colombia
├── 003_create_empleados.js
├── 004_create_cargos_salarios.js
└── 005_create_documentos_empleado.js

contract-service/migrations/
├── 001_create_contratos.js
└── 002_create_adendas_contratos.js

vacation-service/migrations/
├── 001_create_festivos.js
├── 002_create_vacaciones.js
├── 003_create_dias_disponibles.js
└── 004_seed_festivos_2025.js

history-service/migrations/
├── 001_create_historial_cambios.js
└── 002_create_acciones_sistema.js

super-admin-service/migrations/
├── 001_create_super_admins.js
├── 002_create_empresas.js
├── 003_create_admins_empresa.js
└── 004_create_refresh_tokens_superadmin.js
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
    celular:             { type: 'varchar(10)' },
    salario:             { type: 'decimal(12,2)' },
    nivel_educativo:     { type: 'varchar(50)' },
    activo:              { type: 'boolean', default: true },
    ultimo_login:        { type: 'timestamp' },
    fecha_creacion:      { type: 'timestamp', default: pgm.func('current_timestamp') },
    fecha_actualizacion: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  pgm.addConstraint('usuarios', 'chk_rol',
    "rol IN ('admin', 'rrhh', 'consulta')");
  pgm.addConstraint('usuarios', 'chk_nivel_educativo',
    "nivel_educativo IN ('bachiller','tecnico','universitario','especialista','magister','doctorado')");
  pgm.addConstraint('usuarios', 'chk_salario_max',
    'salario IS NULL OR salario <= 100000000');
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
exports.down = (pgm) => { pgm.sql("DELETE FROM festivos WHERE anio = 2025;"); };
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

# Agregar bloques análogos para employee, contract, vacation, history, super-admin

volumes:
  postgres_auth_data:
  postgres_employee_data:
  postgres_contract_data:
  postgres_vacation_data:
  postgres_history_data:
  postgres_superadmin_data:
```

> **Importante:** los `volumes` garantizan que los datos persisten aunque el contenedor se reinicie.

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

### Flujo de Subida con Aprobación RRHH

```
Frontend
  → POST /empleados/:id/documentos/temporal  (solicita URL de subida temporal)
Employee Service
  → Valida formato (PDF/JPG/PNG) y tamaño (máx. 5 MB)
  → Genera presigned URL con destino /temporal/ en S3 (válida 5 min)
  → Guarda en documentos_empleado: estado='pendiente_aprobacion'
  → Envía correo real a RRHH para revisión
RRHH
  → PATCH /empleados/:id/documentos/:docId/aprobar
  → Employee Service mueve de /temporal/ a ruta definitiva en S3
  → Actualiza estado='activo' en documentos_empleado
```

### Estructura de carpetas S3

```
hr-system-empleados/
├── fotos/
├── hojas-de-vida/
├── contratos-firmados/
├── certificados/
└── temporal/            ← documentos pendientes de aprobación RRHH
```

### Configuración S3

```javascript
// employee-service/src/config/s3.js
const { S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const generarUrlSubidaTemporal = async (empleadoId, tipo, contentType) => {
  const ext = contentType.split('/')[1];
  const key = `temporal/${empleadoId}_${tipo}_${Date.now()}.${ext}`;
  const url = await getSignedUrl(s3, new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME, Key: key, ContentType: contentType
  }), { expiresIn: 300 });
  return { url, key };
};

const moverADefinitivo = async (keyTemporal, tipo) => {
  const keyDefinitivo = keyTemporal.replace('temporal/', `${tipo}s/`);
  await s3.send(new CopyObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    CopySource: `${process.env.S3_BUCKET_NAME}/${keyTemporal}`,
    Key: keyDefinitivo
  }));
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME, Key: keyTemporal
  }));
  return keyDefinitivo;
};

const generarUrlDescarga = async (key) =>
  getSignedUrl(s3, new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME, Key: key
  }), { expiresIn: 3600 });

module.exports = { generarUrlSubidaTemporal, moverADefinitivo, generarUrlDescarga };
```

---

## 10. Diseño de Pantallas

> Mockups en Figma: `[Agregar enlace]`

| Pantalla | Roles |
|----------|-------|
| Login | Todos |
| Dashboard — métricas generales | Admin, RRHH, Super Admin |
| Lista de Empleados (filtros de estado corregidos) | Todos |
| Detalle de Empleado — info, cargo/salario histórico, documentos, estado con justificación | Todos |
| Formulario Empleado — con preservación de datos y upload S3 | Admin, RRHH |
| Módulo de Departamentos del Cargo | Admin |
| Contratos + Adendas | Admin, RRHH |
| Solicitud de Vacaciones — validaciones en tiempo real + días disponibles | Admin, RRHH |
| Gestión de Vacaciones — aprobación/rechazo | Admin, RRHH |
| Documentos de Empleado — subida temporal + bandeja de aprobación RRHH | Admin, RRHH |
| Solicitud de Corrección de Datos | Todos |
| Reportes + Exportación CSV organizada | Todos |
| Administración de Usuarios | Admin |
| Log de Auditoría (con tipo de acción, IP, user agent) | Admin |
| **Portal Super Admin** — empresas, administradores, auditoría global | Super Admin |

---

## 11. API REST Documentada

> Swagger: `[URL]` · Postman Collection: `[URL]`

### Auth Service — `/api/auth`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Registrar usuario (con validación de correo real) | ❌ |
| POST | `/login` | Login → access_token + refresh_token | ❌ |
| POST | `/refresh` | Renovar access_token con refresh_token | ❌ |
| POST | `/logout` | Revocar refresh_token actual (registra en history) | ✅ |
| POST | `/logout-all` | Revocar todos los refresh_tokens del usuario (registra en history) | ✅ |

```json
// POST /api/auth/login — Response 200
{
  "access_token":  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "d4f8a9b2c1e3...",
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
| GET | `/` | Listar empleados (filtros y búsqueda corregidos, máx 50 chars) | Todos | ✅ |
| GET | `/:id` | Detalle del empleado | Todos | ✅ |
| POST | `/` | Registrar empleado (formulario con preservación de datos) | Admin, RRHH | ✅ |
| PATCH | `/:id` | Actualizar datos de identidad | Admin, RRHH | ✅ |
| DELETE | `/:id` | Desactivar empleado | Admin | ✅ |
| POST | `/:id/solicitar-correccion` | Enviar solicitud de corrección a RRHH por correo | Todos | ✅ |
| GET | `/:id/cargo-actual` | Cargo y salario actual | Todos | ✅ |
| GET | `/:id/historial-cargo` | Historial de cargos y salarios | Admin, RRHH | ✅ |
| POST | `/:id/cargo` | Registrar nuevo cargo/salario | Admin, RRHH | ✅ |
| GET | `/:id/documentos` | Listar documentos del empleado | Todos | ✅ |
| POST | `/:id/documentos/temporal` | Subir documento temporal (pendiente aprobación RRHH) | Admin, RRHH | ✅ |
| PATCH | `/:id/documentos/:docId/aprobar` | Aprobar documento y moverlo a S3 definitivo | Admin, RRHH | ✅ |
| PATCH | `/:id/documentos/:docId/rechazar` | Rechazar documento temporal | Admin, RRHH | ✅ |
| GET | `/documentos/:docId/url` | Obtener URL de descarga S3 | Todos | ✅ |
| GET | `/export/csv` | Exportar tabla con formato estático organizado (cada campo en su celda) | Admin, RRHH | ✅ |
| GET | `/departamentos` | Listar departamentos de Colombia | Todos | ✅ |
| GET | `/departamentos/cargos` | Módulo de departamentos del cargo (solo admin) | Admin | ✅ |

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

---

### Report Service — `/api/reportes`

| Método | Endpoint | Descripción | Rol | Auth |
|--------|----------|-------------|-----|------|
| GET | `/estado-laboral` | Empleados activos con cargo actual | Todos | ✅ |
| GET | `/vacaciones` | Resumen de vacaciones | Todos | ✅ |
| GET | `/contratos` | Contratos por tipo y estado | Todos | ✅ |
| GET | `/empleado/:id` | Reporte completo de un empleado | Admin, RRHH | ✅ |
| GET | `/turnover` | Empleados retirados en un período | Admin | ✅ |

---

### History Service — `/api/historial`

| Método | Endpoint | Descripción | Rol | Auth |
|--------|----------|-------------|-----|------|
| POST | `/cambios` | Registrar cambio (con tipo_accion, ip_origen, user_agent) | Interno | ✅ |
| GET | `/cambios/empleado/:id` | Historial de un empleado (filtro por tipo_accion) | Admin, RRHH | ✅ |
| GET | `/cambios` | Listado general con filtros | Admin | ✅ |
| POST | `/acciones` | Registrar acción del sistema | Interno | ✅ |
| GET | `/acciones` | Log de acciones con filtros (tipo, IP, rango de fechas) | Admin | ✅ |

---

### Super Admin Service — `/api/super-admin`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Registrar super admin | 🔒 Interno |
| POST | `/login` | Login super admin | ❌ |
| POST | `/recover-password` | Recuperación de contraseña | ❌ |
| GET | `/empresas` | Listar todas las empresas | ✅ |
| POST | `/empresas` | Registrar nueva empresa + 2 admins | ✅ |
| GET | `/empresas/:id` | Detalle de empresa + admins | ✅ |
| POST | `/empresas/:id/admins` | Asignar/reemplazar administrador | ✅ |
| POST | `/empresas/:id/usuarios` | Crear usuario RRHH o consulta | ✅ |
| GET | `/empresas/:id/empleados` | Lista de empleados con detalle de estado | ✅ |
| GET | `/auditoria` | Log global de auditoría | ✅ |

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

### Casos de Prueba — Auth Service

| ID | Caso | Tipo |
|----|------|------|
| TC-AUTH-001 | Login exitoso retorna access_token + refresh_token | Positivo |
| TC-AUTH-002 | Login con contraseña incorrecta retorna 401 | Negativo |
| TC-AUTH-003 | Refresh token válido retorna nuevo access_token | Positivo |
| TC-AUTH-004 | Refresh token revocado retorna 401 | Negativo |
| TC-AUTH-005 | Logout revoca el refresh_token y registra en History como 'logout' | Positivo |
| TC-AUTH-006 | Logout-all revoca todos los tokens y registra en History como 'logout_all' | Positivo |
| TC-AUTH-007 | Acceso a endpoint protegido sin token retorna 401 | Negativo |
| TC-AUTH-008 | Registro con correo inexistente retorna 400 | Negativo |
| TC-AUTH-009 | Registro con rol consulta sin ser empleado retorna 403 | Negativo |
| TC-AUTH-010 | Registro con celular de más de 10 caracteres retorna 400 | Negativo |
| TC-AUTH-011 | Registro con salario mayor a 100M COP retorna 400 | Negativo |
| TC-AUTH-012 | nivel_educativo = 'magister' se guarda correctamente | Positivo |

### Casos de Prueba — Employee Service

| ID | Caso | Tipo | Resultado Esperado |
|----|------|------|-------------------|
| TC-EMP-001 | Registrar empleado completo | Positivo | 201 Created |
| TC-EMP-002 | Registrar con cédula duplicada | Negativo | 409 Conflict |
| TC-EMP-003 | Registrar cargo nuevo → cierra el anterior | Positivo | activo=false en cargo anterior |
| TC-EMP-004 | Filtro estado=activo retorna solo activos | Positivo | Lista filtrada correctamente |
| TC-EMP-005 | Filtro estado=inactivo retorna solo inactivos | Positivo | Lista filtrada correctamente |
| TC-EMP-006 | Filtro estado=transicion retorna solo en transición | Positivo | Lista filtrada correctamente |
| TC-EMP-007 | Búsqueda con más de 50 caracteres retorna 400 | Negativo | 400 Bad Request |
| TC-EMP-008 | Subida de documento mayor a 5 MB retorna 400 | Negativo | 400 Bad Request |
| TC-EMP-009 | Subida de documento con formato inválido retorna 400 | Negativo | 400 Bad Request |
| TC-EMP-010 | Documento temporal queda en estado pendiente_aprobacion | Positivo | 201 + estado correcto |
| TC-EMP-011 | Aprobación de documento lo mueve a estado activo | Positivo | estado='activo' en BD y en S3 definitivo |
| TC-EMP-012 | Exportación CSV genera cada campo en su celda | Positivo | Archivo legible en Excel |
| TC-EMP-013 | Formulario preserva datos si se cierra la ventana | Positivo | Datos restaurados al volver |
| TC-EMP-014 | Solicitud de corrección envía correo a RRHH | Positivo | Correo recibido en SMTP |
| TC-EMP-015 | Editar con rol Consulta retorna 403 | Negativo | 403 Forbidden |

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

### Casos de Prueba — History Service

| ID | Caso | Tipo | Resultado Esperado |
|----|------|------|-------------------|
| TC-HIST-001 | Login registra tipo_accion='login', ip_origen, user_agent | Positivo | Registro completo en BD |
| TC-HIST-002 | Logout registra tipo_accion='logout' | Positivo | Tipo correcto en BD |
| TC-HIST-003 | Logout-all registra tipo_accion='logout_all' | Positivo | Tipo correcto diferenciado |
| TC-HIST-004 | Refresh registra tipo_accion='token_renovado' | Positivo | Tipo correcto en BD |
| TC-HIST-005 | Cambio de empleado incluye empleado_id, tipo_accion, usuario | Positivo | Registro completo |
| TC-HIST-006 | Filtro por tipo_accion retorna solo esa categoría | Positivo | Lista filtrada |

### Ejemplo — Prueba Unitaria (Jest)

```javascript
describe('Vacation Service — Validaciones de negocio', () => {

  test('TC-VAC-002: Rechaza con menos de 5 días hábiles', () => {
    const inicio = new Date('2025-03-03');
    const fin    = new Date('2025-03-05');
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
    { duration: '1m', target: 10 },
    { duration: '3m', target: 30 },
    { duration: '1m', target: 0  },
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

  const listar = http.get(`${__ENV.BASE_URL}/api/empleados`, { headers });
  check(listar, {
    'status 200':        (r) => r.status === 200,
    'respuesta < 500ms': (r) => r.timings.duration < 500,
    'retorna array':     (r) => Array.isArray(r.json()),
  });
  errorRate.add(listar.status !== 200);
  sleep(1);

  const cargo = http.get(`${__ENV.BASE_URL}/api/empleados/1/cargo-actual`, { headers });
  check(cargo, {
    'status 200 o 404':  (r) => [200, 404].includes(r.status),
    'respuesta < 500ms': (r) => r.timings.duration < 500,
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
    { duration: '2m', target: 20  },
    { duration: '5m', target: 50  },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0   },
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

  const res = http.get(`${__ENV.BASE_URL}/api/vacaciones/empleado/1/disponibles`, { headers });
  check(res, {
    'status 200':        (r) => r.status === 200,
    'latencia < 2000ms': (r) => r.timings.duration < 2000,
    'sin error 500':     (r) => r.status !== 500,
    'tiene dias_disponibles': (r) => r.json('dias_disponibles') !== undefined,
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
http_req_duration..............: avg=141ms  p(90)=169ms  p(95)=175ms  p(99)=238ms
http_req_failed................: 0.00%   ✓ 0      ✗ 5004
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

### Comandos de Ejecución

```bash
brew install k6          # macOS
sudo apt install k6      # Ubuntu/Debian

k6 run \
  --env BASE_URL=http://localhost:3002 \
  --env AUTH_URL=http://localhost:3001 \
  tests/performance/load/employees-load.js

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
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_gmail
```

**employee-service/.env**
```env
PORT=3002
DATABASE_URL=postgres://postgres:password@postgres-employee:5432/employee_db
JWT_SECRET=min_32_caracteres_aqui_muy_seguro_1234
HISTORY_SERVICE_URL=http://history-service:3006
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=hr-system-empleados
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_gmail
RRHH_EMAIL=rrhh@empresa.com
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

**super-admin-service/.env**
```env
PORT=3007
DATABASE_URL=postgres://postgres:password@postgres-superadmin:5432/superadmin_db
JWT_SECRET=min_32_caracteres_superadmin_muy_seguro
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7
AUTH_SERVICE_URL=http://auth-service:3001
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_gmail
```

### Levantar con Docker Compose

```bash
git clone https://github.com/tu-usuario/hr-system-backend.git
cd hr-system-backend

for svc in auth employee contract vacation report history super-admin; do
  cp ${svc}-service/.env.example ${svc}-service/.env
done

docker-compose up --build

docker-compose ps
docker-compose logs employee-service | grep -i "seed\|migrat"
```

### Ejecutar Pruebas

```bash
cd vacation-service && npm test
cd contract-service && npm test

npm run test:coverage

cd ../hr-system-tests && npx playwright test

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
| **Empresarial** | $299.000 COP | Ilimitados | + Soporte prioritario, SLA, log de auditoría, Super Admin |

### Costos de Infraestructura (Mensual)

| Servicio | Estimado |
|---------|---------|
| Backend microservicios (Render/Railway) | $20–50 USD |
| Frontend (Vercel) | $0–20 USD |
| PostgreSQL administrado | $10–30 USD |
| AWS S3 | $1–5 USD |
| SMTP (SendGrid) | $0–15 USD |
| **Total** | **$31–120 USD/mes** |

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

**Nuestra ventaja:** precio fijo por empresa (no por empleado), 100% español, festivos y legislación colombiana integrados, historial de carrera real, gestión de sesiones segura con refresh tokens, administración multiempresa centralizada y flujo de aprobación de documentos.

---

## 18. Roadmap y Mejoras Futuras

### v1.0 — MVP Original
- [x] Auth con JWT + refresh tokens + logout real
- [x] Empleados con historial de cargo/salario y documentos en S3
- [x] Contratos con adendas y validación REST
- [x] Vacaciones con días disponibles, festivos en BD y SMTP
- [x] Reportes sin BD propia
- [x] Historial y log de auditoría
- [x] Migraciones + seeds automáticos en Docker
- [x] Pruebas unitarias, E2E (Playwright), Performance (k6)

### v2.0 — Mejoras implementadas (ciclo actual)
- [x] Validación de correo real al registrar cuentas
- [x] Campos corregidos: celular (10 chars), salario (tope 100M COP), nivel educativo ampliado (especialista, magíster, doctorado)
- [x] Correos reales en cambios de empleados y solicitudes
- [x] Auditoría detallada: tipo_accion, IP, user_agent, empleado afectado, quién cambió qué
- [x] Registros correctos de logout y logout-all en historial (diferenciados)
- [x] Renovación de token registrada correctamente en historial
- [x] Rol consulta restringido a empleados registrados
- [x] Preservación de datos del formulario de empleado en localStorage
- [x] Filtro de estado corregido (activo, inactivo, transición, retirado)
- [x] Búsqueda de empleados limitada a 50 caracteres
- [x] Subida temporal de documentos con aprobación RRHH (formato PDF/JPG/PNG, máx 5MB)
- [x] Exportación CSV con formato estático y organizado (cada campo en su celda)
- [x] Solicitud de corrección de datos via correo a RRHH
- [x] Lista de justificaciones para estado inactivo
- [x] Estado "transición" para empleados con contrato próximo a vencer
- [x] Importación de departamentos de Colombia desde JSON
- [x] Módulo de departamentos del cargo (solo admin)
- [x] **Super Admin Service** — administración centralizada multiempresa

### v2.1 — Q3 2025
- [ ] Portal de autoservicio para empleados
- [ ] Exportación de reportes a Excel/PDF
- [ ] Notificaciones push + email para aprobaciones

### v2.2 — Q4 2025
- [ ] Módulo de nómina básica
- [ ] Firma digital de contratos
- [ ] Dashboard con gráficas de rotación y vacaciones

### v3.0 — 2026
- [ ] App móvil (React Native)
- [ ] Integración con Siigo / Alegra
- [ ] IA para predicción de rotación de personal

---

## 19. Diagramas Obligatorios

> Versiones editables en `/docs/diagrams/` (draw.io / PlantUML).

### 19.1 Diagrama de Secuencia — Flujo Principal Completo

```
RRHH/Admin  Frontend   AuthSvc   EmployeeSvc  S3 Bucket  ContractSvc  VacationSvc  HistorySvc  SMTP
    │           │          │           │            │            │            │            │        │
    │──Login───►│          │           │            │            │            │            │        │
    │           │──POST /login─────────►│           │            │            │            │        │
    │           │◄──access+refresh token│           │            │            │            │        │
    │           │          │──registra 'login' ip+ua────────────────────────────────────►│        │
    │◄──tokens──│          │           │            │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Reg. empleado──────►│           │            │            │            │            │        │
    │           │──POST /empleados──────────────────►            │            │            │        │
    │           │          │           │──Guarda en BD           │            │            │        │
    │           │          │           │──POST /historial (tipo_accion='creacion_empleado')►       │
    │           │◄──201 + empleado_id───│           │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Subir doc temporal─►│           │            │            │            │            │        │
    │           │──POST /documentos/temporal────────►            │            │            │        │
    │           │          │           │──valida formato+tamaño  │            │            │        │
    │           │          │           │──genera presigned URL → S3 /temporal/───────────►│        │
    │           │          │           │──correo real a RRHH──────────────────────────────────────►│
    │           │◄──201 estado='pendiente'           │            │            │            │        │
    │──Aprobar doc─────────►            │            │            │            │            │        │
    │           │──PATCH /documentos/aprobar─────────►            │            │            │        │
    │           │          │           │──mueve /temporal/ → S3 definitivo──────────────►│        │
    │           │◄──200─────────────────│           │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Crear contrato─────►│           │            │            │            │            │        │
    │           │──POST /contratos──────────────────────────────►│            │            │        │
    │           │          │           │◄──GET /empleados/:id────►            │            │        │
    │           │          │           │──200 empleado existe────►            │            │        │
    │           │◄──201 contrato────────────────────────────────│            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Solicitar vacaciones►│           │            │            │            │            │        │
    │           │──POST /vacaciones──────────────────────────────────────────►│            │        │
    │           │          │           │            │            │            │──Valida reglas       │
    │           │          │           │            │            │            │──dias_pendientes += N│
    │           │          │           │            │            │            │──Correo real RRHH───►│
    │           │          │           │            │            │            │──POST /historial─────►
    │           │◄──201 solicitud────────────────────────────────────────────│            │        │
    │           │          │           │            │            │            │            │        │
    │──Logout──►│          │           │            │            │            │            │        │
    │           │──POST /logout─────────►           │            │            │            │        │
    │           │          │──revoca token           │            │            │            │        │
    │           │          │──registra 'logout' ip+ua───────────────────────────────────►│        │
    │           │◄──200─────│           │            │            │            │            │        │
```

---

### 19.2 Diagrama de Componentes — Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  CLIENTE (Navegador)                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  FRONTEND — React + Vite + TailwindCSS  [Vercel]                                        │ │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐  │ │
│  │  │   Auth   │ │ Employees  │ │  Vacs    │ │Contracts │ │ Reports │ │  Super Admin   │  │ │
│  │  │ - Login  │ │ - CRUD     │ │ - Solic. │ │ - CRUD   │ │ - Vistas│ │  - Empresas   │  │ │
│  │  │ - JWT    │ │ - Docs S3  │ │ - Apro.  │ │ - Adendas│ │ - CSV   │  │  - Auditoria  │  │ │
│  │  │ - Refresh│ │ - Historial│ │ - Dispon.│ │          │ │         │ │  - Admins     │  │ │
│  │  └──────────┘ └────────────┘ └──────────┘ └──────────┘ └─────────┘ └────────────────┘  │ │
│  └─────────────────────────────────┬───────────────────────────────────────────────────────┘ │
└────────────────────────────────────│────────────────────────────────────────────────────────┘
                                     │ HTTPS + Bearer Token (JWT)
┌────────────────────────────────────▼────────────────────────────────────────────────────────┐
│  BACKEND — 7 Microservicios [Railway / Render]                                                │
│                                                                                               │
│  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────┐  ┌──────────────────────┐ │
│  │ Auth Svc  :3001  │  │ Employee Svc :3002  │  │Contract :3003  │  │ Super Admin Svc :3007│ │
│  │ auth_db          │  │ employee_db         │  │ contract_db    │  │ superadmin_db        │ │
│  └──────────────────┘  └──────────┬──────────┘  └───────┬────────┘  └──────────────────────┘ │
│                                   │ REST                  │ REST                               │
│  ┌──────────────────┐  ┌──────────▼──────────┐  ┌───────▼────────┐                           │
│  │ Vacation :3004   │  │ Report Svc :3005     │  │ History :3006  │◄─── todos los servicios   │
│  │ vacation_db      │  │ (SIN BD propia)      │  │ history_db     │                           │
│  └──────────────────┘  └─────────────────────┘  └────────────────┘                           │
│                                                                                               │
│  ┌──────────────────────────────┐   ┌────────────────────────────────────────────────────┐   │
│  │  AWS S3                      │   │  SMTP (Nodemailer)                                  │   │
│  │  /fotos/ /hojas-de-vida/     │   │  Correos reales: cambios empleado, vacaciones,      │   │
│  │  /certificados/ /temporal/   │   │  documentos pendientes, correcciones de datos        │   │
│  └──────────────────────────────┘   └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 19.3 Diagrama Entidad-Relación Completo

```
╔══════════════════════════════╗     ╔══════════════════════════════════════════════════════╗
║  [DB AUTH]                   ║     ║  [DB EMPLOYEE]                                       ║
╠══════════════════════════════╣     ╠══════════════════════════════════════════════════════╣
║  usuarios                    ║     ║  departamentos                                       ║
║  ─────────────────────────── ║     ║  id / nombre / codigo_dane / activo                  ║
║  id            SERIAL PK     ║     ║                                                      ║
║  cedula        VARCHAR UK     ║JWT  ║  empleados                                           ║
║  email         VARCHAR UK     ║────►║  id / nombre / apellido / cedula                    ║
║  password      VARCHAR NN     ║     ║  celular VARCHAR(10) / correos                       ║
║  rol           VARCHAR NN     ║     ║  nivel_educativo (ampliado)                          ║
║  celular       VARCHAR(10)    ║     ║  estado CHECK (activo|inactivo|transicion|retirado)  ║
║  salario       ≤ 100M COP    ║     ║  justificacion_inactivo VARCHAR                      ║
║  nivel_educativo (ampliado)   ║     ║  departamento_id FK departamentos                   ║
║  activo        BOOLEAN        ║     ╚══════════════════╤═══════════════════════════════════╝
║                               ║                        │ 1:N
║  refresh_tokens               ║      ┌─────────────────┼──────────────────────────────┐
║  token_hash / ip / user_agent ║   ╔══╧══════════════╗  ╔══╧══════════════════════════╗│
╚══════════════════════════════╝   ║ cargos_salarios  ║  ║ documentos_empleado         ║│
                                   ║ salario ≤ 100M   ║  ║ mime_type CHECK (pdf/jpg/png)║│
                                   ║ departamento_id  ║  ║ tamano_bytes ≤ 5MB          ║│
                                   ╚══════════════════╝  ║ estado (pendiente|activo|    ║│
                                                         ║  rechazado)                  ║│
                                                         ╚══════════════════════════════╝│
                                                                  ↓ S3 /temporal/ → /definitivo/

╔═══════════════════════════╗   ╔══════════════════════╗   ╔═══════════════════════════════╗
║  [DB CONTRACT]            ║   ║  [DB VACATION]       ║   ║  [DB HISTORY]                 ║
╠═══════════════════════════╣   ╠══════════════════════╣   ╠═══════════════════════════════╣
║  contratos                ║   ║  vacaciones          ║   ║  historial_cambios             ║
║  salario ≤ 100M COP       ║   ║  festivos (seed CO)  ║   ║  tipo_accion VARCHAR NN        ║
║  adendas_contratos        ║   ║  dias_disponibles    ║   ║  ip_origen / user_agent        ║
║  cambios_json JSONB       ║   ║  (col. GENERATED)    ║   ║                               ║
╚═══════════════════════════╝   ╚══════════════════════╝   ║  acciones_sistema              ║
                                                           ║  tipo_accion VARCHAR NN        ║
╔═══════════════════════════╗                              ║  ip_origen / user_agent        ║
║  [DB SUPER ADMIN]         ║                              ╚═══════════════════════════════╝
╠═══════════════════════════╣
║  super_admins             ║
║  empresas                 ║
║  admins_empresa (max 2)   ║
║  refresh_tokens_superadmin║
╚═══════════════════════════╝
```

---

## 20. Estructura de Repositorios

### Repositorio Backend — `hr-system-backend`

```
hr-system-backend/
│
├── auth-service/                           ← Servicio 1: Auth + validación correo real
│   ├── src/
│   │   ├── controllers/auth.controller.js
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── token.service.js
│   │   │   └── emailVerification.service.js  ← validación de correo real al registrar
│   │   ├── repositories/
│   │   │   ├── user.repository.js
│   │   │   └── refreshToken.repository.js
│   │   ├── clients/
│   │   │   ├── employeeServiceClient.js     ← verifica correo como empleado (rol consulta)
│   │   │   └── historyServiceClient.js      ← registra login/logout/refresh
│   │   ├── middlewares/verifyToken.js
│   │   ├── routes/auth.routes.js
│   │   └── index.js
│   ├── migrations/
│   │   ├── 001_create_usuarios.js
│   │   └── 002_create_refresh_tokens.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── employee-service/                       ← Servicio 2: Empleados + departamentos CO + docs aprobación
│   ├── src/
│   │   ├── controllers/employee.controller.js
│   │   ├── services/
│   │   │   ├── employee.service.js
│   │   │   ├── document.service.js          ← flujo temporal + aprobación S3
│   │   │   └── email.service.js             ← correos reales a RRHH
│   │   ├── repositories/
│   │   │   ├── employee.repository.js
│   │   │   ├── cargoSalario.repository.js
│   │   │   ├── documento.repository.js
│   │   │   └── departamento.repository.js
│   │   ├── config/s3.js                     ← presigned URLs + mover /temporal/ → definitivo
│   │   ├── middlewares/verifyToken.js
│   │   └── routes/employee.routes.js
│   ├── migrations/
│   │   ├── 001_create_departamentos.js
│   │   ├── 002_seed_departamentos_colombia.js
│   │   ├── 003_create_empleados.js
│   │   ├── 004_create_cargos_salarios.js
│   │   └── 005_create_documentos_empleado.js
│   ├── data/
│   │   └── departamentos_colombia.json      ← JSON con 32 departamentos
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── contract-service/                       ← Servicio 3: Contratos + adendas (valida REST)
│   ├── src/
│   │   ├── controllers/contract.controller.js
│   │   ├── services/contract.service.js
│   │   ├── repositories/
│   │   │   ├── contract.repository.js
│   │   │   └── adenda.repository.js
│   │   ├── clients/
│   │   │   ├── employeeServiceClient.js
│   │   │   └── historyServiceClient.js
│   │   ├── middlewares/verifyToken.js
│   │   └── routes/contract.routes.js
│   ├── migrations/
│   │   ├── 001_create_contratos.js
│   │   └── 002_create_adendas_contratos.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── vacation-service/                       ← Servicio 4: Vacaciones + días disponibles + festivos
│   ├── src/
│   │   ├── controllers/vacation.controller.js
│   │   ├── services/
│   │   │   ├── vacation.service.js
│   │   │   ├── businessRules.service.js
│   │   │   ├── diasDisponibles.service.js
│   │   │   └── email.service.js
│   │   ├── repositories/
│   │   │   ├── vacation.repository.js
│   │   │   ├── diasDisponibles.repository.js
│   │   │   └── festivos.repository.js
│   │   ├── middlewares/verifyToken.js
│   │   └── routes/vacation.routes.js
│   ├── migrations/
│   │   ├── 001_create_festivos.js
│   │   ├── 002_create_vacaciones.js
│   │   ├── 003_create_dias_disponibles.js
│   │   └── 004_seed_festivos_2025.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── report-service/                         ← Servicio 5: Reportes (SIN BD propia)
│   ├── src/
│   │   ├── controllers/report.controller.js
│   │   ├── services/report.service.js
│   │   ├── clients/
│   │   │   ├── employeeServiceClient.js
│   │   │   ├── contractServiceClient.js
│   │   │   └── vacationServiceClient.js
│   │   ├── middlewares/verifyToken.js
│   │   └── routes/report.routes.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── history-service/                        ← Servicio 6: Auditoría con tipo_accion + IP + user_agent
│   ├── src/
│   │   ├── controllers/history.controller.js
│   │   ├── services/history.service.js
│   │   ├── repositories/
│   │   │   ├── historialCambios.repository.js
│   │   │   └── accionesSistema.repository.js
│   │   ├── middlewares/verifyToken.js
│   │   └── routes/history.routes.js
│   ├── migrations/
│   │   ├── 001_create_historial_cambios.js
│   │   └── 002_create_acciones_sistema.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── super-admin-service/                    ← Servicio 7: Administración centralizada multiempresa (NUEVO)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── superAdmin.controller.js
│   │   │   └── empresa.controller.js
│   │   ├── services/
│   │   │   ├── superAdmin.service.js
│   │   │   ├── empresa.service.js
│   │   │   └── email.service.js
│   │   ├── repositories/
│   │   │   ├── superAdmin.repository.js
│   │   │   ├── empresa.repository.js
│   │   │   └── adminEmpresa.repository.js
│   │   ├── clients/
│   │   │   ├── authServiceClient.js         ← crea usuarios en Auth Service
│   │   │   ├── employeeServiceClient.js     ← consulta empleados + estados
│   │   │   └── historyServiceClient.js      ← consulta auditoría global
│   │   ├── middlewares/verifyToken.js
│   │   └── routes/
│   │       ├── superAdmin.routes.js
│   │       └── empresa.routes.js
│   ├── migrations/
│   │   ├── 001_create_super_admins.js
│   │   ├── 002_create_empresas.js
│   │   ├── 003_create_admins_empresa.js
│   │   └── 004_create_refresh_tokens_superadmin.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
├── docker-compose.prod.yml
│
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       └── deploy.yml
│
└── README.md
```

### Repositorio de Pruebas — `hr-system-tests`

```
hr-system-tests/
│
├── e2e/
│   ├── auth.spec.ts                        ✅ Implementado por compañero
│   ├── employees.spec.ts
│   ├── contracts.spec.ts
│   ├── vacations.spec.ts
│   ├── reports.spec.ts
│   └── super-admin.spec.ts                 ← Nuevo: flujos del super admin
│
├── integration/
│   ├── auth.api.spec.ts                    ✅ Implementado por compañero
│   ├── employees.api.spec.ts
│   ├── contracts.api.spec.ts
│   ├── vacations.api.spec.ts
│   ├── history.api.spec.ts
│   └── super-admin.api.spec.ts             ← Nuevo
│
├── performance/
│   ├── load/
│   │   ├── employees-load.js
│   │   ├── vacations-load.js
│   │   └── contracts-load.js
│   ├── stress/
│   │   ├── employees-stress.js
│   │   └── vacations-stress.js
│   └── results/
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
│   │   ├── employees/
│   │   │   ├── EmployeeForm.tsx             ← preserva datos en localStorage
│   │   │   ├── EmployeeFilters.tsx          ← filtros de estado corregidos
│   │   │   ├── DocumentUploader.tsx         ← flujo temporal + aprobación RRHH
│   │   │   └── CorrectionRequest.tsx        ← solicitud de corrección a RRHH
│   │   ├── vacations/
│   │   ├── contracts/
│   │   ├── reports/
│   │   └── super-admin/
│   │       ├── EmpresasList.tsx
│   │       ├── EmpresaDetail.tsx
│   │       └── AuditGlobal.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Employees.tsx
│   │   ├── EmployeeDetail.tsx
│   │   ├── Contracts.tsx
│   │   ├── Vacations.tsx
│   │   ├── Reports.tsx
│   │   ├── AuditLog.tsx
│   │   └── SuperAdmin.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useEmployees.ts
│   │   └── useFormPersistence.ts            ← hook para preservar formularios en localStorage
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── employee.service.ts
│   │   ├── contract.service.ts
│   │   ├── vacation.service.ts
│   │   ├── report.service.ts
│   │   └── superAdmin.service.ts
│   ├── context/AuthContext.tsx
│   └── utils/api.ts
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
- **Validación de correo real** al registrar: no se permiten correos con dominios inexistentes.
- **Restricción de rol consulta**: solo accesible para empleados registrados en el sistema.
- Todos los endpoints protegidos con **Bearer Token**; solo `/login`, `/register` y `/refresh` son públicos.
- Middleware de autorización por **rol** en cada endpoint sensible.
- Archivos en S3 con acceso **privado** por defecto; lectura solo via **presigned URLs** (1h expiración).
- Documentos en **flujo de aprobación** (temporal → RRHH aprueba → definitivo) antes de ser visibles como activos.
- Política IAM con **mínimo privilegio**: solo `PutObject`, `GetObject`, `DeleteObject`.
- Variables sensibles exclusivamente en **archivos `.env`** (nunca en código).
- `.env` en `.gitignore`; `.env.example` como plantilla en el repo.
- **HTTPS obligatorio** en producción.
- **Volumes en Docker Compose** para persistir datos entre reinicios.
- **SonarCloud** analiza vulnerabilidades en cada Pull Request.
- Log de auditoría (`acciones_sistema`) registra todos los eventos con `tipo_accion`, `ip_origen` y `user_agent`.

---

*Wiki — Sistema Administrador de Empleados · Versión 4.0 — Modelo profesional para uso empresarial multiempresa*
*17 tablas · 7 microservicios · AWS S3 · Refresh Tokens · Festivos en BD · Super Admin Service · Auditoría completa*