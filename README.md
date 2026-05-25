# 🏢 HR System — Sistema Administrador de Empleados

> Plataforma de gestión de recursos humanos basada en arquitectura de microservicios, diseñada para empresas colombianas.  
> **Versión 4.0** — Modelo de datos profesional, multiempresa, con auditoría completa y flujo de roles diferenciado.

---

## Tabla de Contenido

1. [Contexto del Problema](#1-contexto-del-problema)
2. [Solución Propuesta](#2-solución-propuesta)
3. [Roles y Usuarios](#3-roles-y-usuarios)
4. [Alcance del Proyecto](#4-alcance-del-proyecto)
5. [Riesgos y Mitigaciones](#5-riesgos-y-mitigaciones)
6. [Arquitectura del Sistema](#6-arquitectura-del-sistema)
7. [Microservicios](#7-microservicios)
8. [Modelo de Datos](#8-modelo-de-datos)
9. [Almacenamiento de Archivos — AWS S3](#9-almacenamiento-de-archivos--aws-s3)
10. [API REST](#10-api-rest)
11. [Migraciones de Base de Datos](#11-migraciones-de-base-de-datos)
12. [Seguridad](#12-seguridad)
13. [Pruebas](#13-pruebas)
14. [Guía de Ejecución](#14-guía-de-ejecución)
15. [Diseño de Pantallas](#15-diseño-de-pantallas)
16. [Monetización](#16-monetización)
17. [Estudio de Mercado](#17-estudio-de-mercado)
18. [Estrategia de Visibilidad](#18-estrategia-de-visibilidad)
19. [Roadmap](#19-roadmap)
20. [Diagramas](#20-diagramas)
21. [Estructura de Repositorios](#21-estructura-de-repositorios)

---

## 1. Contexto del Problema

La empresa gestiona la información de sus empleados de manera **descentralizada**, utilizando hojas de cálculo, documentos físicos y registros manuales, generando ineficiencias críticas en el área de Recursos Humanos.

| Área | Problema |
|------|----------|
| Registro de empleados | Datos inconsistentes, duplicados y desactualizados |
| Contratos laborales | Sin trazabilidad, registros en papel |
| Gestión de vacaciones | Sin validaciones automáticas ni control de días disponibles |
| Cambios laborales | Sin historial de cargo/salario |
| Control de acceso | Sin separación de roles ni validación de identidad |
| Sesiones de usuario | Sin control real de logout ni expiración de sesión |
| Reportes | Información dispersa, no confiable |
| Auditoría | Sin trazabilidad de qué cambió, quién lo cambió ni desde dónde |
| Administración multiempresa | Sin herramienta centralizada para gestionar múltiples clientes |

---

## 2. Solución Propuesta

Sistema web centralizado basado en **arquitectura de microservicios**, con:

- Control estricto por roles (4 niveles diferenciados)
- Trazabilidad completa de todas las acciones del sistema
- Gestión de sesiones segura con JWT + Refresh Tokens con rotación
- Recuperación de contraseña vía token de un solo uso (15 min)
- Cálculo automático de vacaciones disponibles con festivos colombianos en BD
- Almacenamiento de documentos en AWS S3 con presigned URLs
- Notificaciones reales por correo vía Gmail SMTP (Nodemailer)
- Administración centralizada para escalar la solución a múltiples empresas
- 4 dashboards independientes según el rol del usuario

### Flujo general del sistema

```
[Super Admin] Registra empresa → habilita 2 administradores → envía credenciales por correo
      ↓
[Admin] Crea usuarios RRHH (máx. 2 por empresa) → registra empleados
      ↓
[Sistema] Crea cuenta Consultante automática para cada empleado y envía credenciales
      ↓
[RRHH] Gestiona contratos, documentos (flujo aprobación S3), vacaciones e historial
      ↓
[Consultante] Consulta su propia información, solicita cambios o vacaciones
      ↓
[Sistema] Registra cada acción en History Service: tipo_accion, IP, user_agent, empleado afectado
```

---

## 3. Roles y Usuarios

El sistema opera con **4 niveles funcionales** claramente diferenciados, cada uno con su propio dashboard.

### 3.1 Super Administrador

Gestiona la plataforma de forma centralizada. Solo pueden existir **2 usuarios** con este rol en toda la plataforma. Cuando se alcanza ese límite, el enlace de registro se desactiva automáticamente.

**Responsabilidades:**
- Registrar empresas y habilitar sus cuentas iniciales (mín. 2 admins por empresa)
- Aprobar y gestionar solicitudes de demo y suscripción
- Acceder a auditoría global de todas las empresas
- Administrar su propio perfil, seguridad y preferencias de notificación

**Dashboard — módulos del panel de navegación:**

- `Dashboard` — Gráficas de torta, línea y barras: suscripciones por plan/fecha, empresas activas/inactivas/retiradas, solicitudes de demo, últimas empresas registradas y últimas acciones del sistema.
- `Formularios Demo y Suscripción` — Recepción y gestión de solicitudes entrantes de demo y de activación de plan.
- `Usuarios Empresas` — Registro de empresas y sus administradores. Botón "Asignar formulario recibido a nueva empresa" que crea la empresa automáticamente, muestra el plan adquirido y estado (inactiva por defecto). Opciones: editar, retirar, eliminar empresa. Al ingresar a una empresa: pestaña de detalles con plan, fechas de vigencia, 2 correos admin activos (activar/desactivar), contrato PDF generado automáticamente que se envía al correo de la empresa con usuarios y contraseñas por defecto.
- `Usuarios Demo` — Gestión de demos temporales. Al aprobarse, se envía por correo usuario (correo del formulario) y contraseña temporal válida 2 días, limitada a 1 dispositivo simultáneo, máximo 2 activaciones por empresa. Al vencer, el sistema invita a suscribirse.
- `Auditoría` — Log de todas las acciones del super administrador: login, aprobar demo, registrar empresa, activar/desactivar empresa o admin, cerrar sesión, renovar token, editar/eliminar empresa.
- `Mi Perfil` — Foto (o iniciales por defecto), nombre, correo, rol, estado activo, fecha de creación, último acceso, opción de cerrar sesión en todos los dispositivos.
- `Configuración`:
  - *Seguridad*: Cambio de contraseña (requiere actual, mín. 8 caracteres con mayúscula, número y carácter especial).
  - *Notificaciones*: Alertas de inicio de sesión y dispositivo, solicitudes de demo, solicitudes de suscripción (activables/desactivables).
  - *Apariencia*: Modo compacto (reduce espaciado de tablas/tarjetas), modo claro/oscuro.
  - *Sesión activa*: Información de la sesión actual y opciones de seguridad.

> **Flujo demo:** cuando una empresa solicita demo desde la página oficial (formulario con nombre, empresa, email corporativo, mensaje, términos y condiciones), la solicitud llega al panel del Super Admin. Si se aprueba, el sistema envía credenciales con acceso de 2 días en 1 dispositivo. Una empresa puede reactivar su demo máximo 2 veces. Al agotar activaciones, recibe invitación de suscripción.

---

### 3.2 Administrador

Cliente que hace uso completo de los servicios de HR System para gestionar los empleados de su empresa. Sus credenciales son suministradas por el Super Admin vía correo.

**Responsabilidades:**
- Acceso total a todos los módulos de la plataforma de su empresa
- Crear y gestionar usuarios de RRHH (máximo 2 activos por empresa)
- Registrar, editar y **eliminar** empleados (requiere confirmar copiando el nombre)
- Gestionar contratos (nuevo, renovar, terminar), adendas, vacaciones, documentos y reportes
- Ver y exportar auditoría de su empresa

**Dashboard — módulos disponibles:**
`Dashboard` · `Empleados` · `Contratos` · `Vacaciones` · `Reportes` · `Usuarios` · `Auditoría` · `Mi Perfil` · `Configuración`

---

### 3.3 Recursos Humanos (RRHH)

Tiene casi las mismas capacidades que el Administrador en la gestión operativa, con una restricción clave: **no puede eliminar empleados**.

> Máximo **2 cuentas RRHH activas** por empresa (1 principal + 1 auxiliar). Esta restricción se valida tanto en backend como en frontend.

**Puede hacer:** registrar y editar empleados, gestionar contratos y adendas, subir y aprobar documentos en S3, aprobar/rechazar vacaciones, exportar reportes y CSV.  
**No puede hacer:** eliminar empleados, crear otros usuarios RRHH.

---

### 3.4 Consultante (Empleado)

Corresponde al empleado de la empresa. Su cuenta se crea **automáticamente** cuando el Admin o RRHH registra al empleado. El sistema genera credenciales (correo + contraseña por defecto) y las envía por correo. Al primer ingreso puede cambiar su contraseña.

**Dashboard — módulos disponibles:**

- `Empleados` — Redirige directamente a su propio perfil (no ve el listado general). Puede ver: información personal, cargo, salario, documentos. No puede editar directamente — usa el botón "Cambio de información" que envía solicitud a RRHH.
- `Documentos` — Solo puede descargar. La carga y aprobación es responsabilidad de RRHH.
- `Contratos` — Solo puede ver y descargar su último contrato vigente.
- `Vacaciones` — Se habilita solo cuando cumple la antigüedad mínima parametrizable. Si no cumple, muestra aviso informativo. Si cumple, puede enviar solicitud (fecha inicio, fecha fin, justificación). RRHH aprueba o rechaza y el empleado recibe notificación por correo.
- `Mi Perfil` — Datos del perfil personal.
- `Configuración` — Cambio de contraseña, activar/desactivar notificación de inicio de sesión.

---

### Matriz de permisos

| Acción | Super Admin | Admin | RRHH | Consultante |
|--------|:-----------:|:-----:|:----:|:-----------:|
| Registrar empresa | ✅ | ❌ | ❌ | ❌ |
| Crear cuentas admin de empresa | ✅ | ❌ | ❌ | ❌ |
| Crear usuarios RRHH | ❌ | ✅ | ❌ | ❌ |
| Máx. 2 RRHH por empresa | — | ✅ aplicado | — | — |
| Crear empleado | ❌ | ✅ | ✅ | ❌ |
| Editar empleado | ❌ | ✅ | ✅ | ❌ |
| **Eliminar empleado** | ❌ | ✅ | ❌ | ❌ |
| Ver listado de empleados | ❌ | ✅ | ✅ | ❌ |
| Ver solo su propio perfil | ❌ | ❌ | ❌ | ✅ |
| Solicitar cambio de información | ❌ | ❌ | ❌ | ✅ |
| Subir documentos a S3 | ❌ | ✅ | ✅ | ❌ |
| Descargar documentos propios | ❌ | ❌ | ❌ | ✅ |
| Crear / renovar / terminar contratos | ❌ | ✅ | ✅ | ❌ |
| Crear adendas | ❌ | ✅ | ✅ | ❌ |
| Ver último contrato propio | ❌ | ❌ | ❌ | ✅ |
| Aprobar / rechazar vacaciones | ❌ | ✅ | ✅ | ❌ |
| Solicitar vacaciones propias | ❌ | ❌ | ❌ | ✅ |
| Ver auditoría | ✅ global | ✅ empresa | ✅ empresa | ❌ |
| Cambiar / recuperar contraseña | ✅ | ✅ | ✅ | ✅ |

---

## 4. Alcance del Proyecto

### Incluido (MVP v2)

- Autenticación con JWT + refresh tokens con rotación + logout real + logout global.
- Recuperación y cambio de contraseña con token de un solo uso (15 min).
- Validación de correo real al crear cuentas (SMTP check).
- Notificaciones reales por correo: credenciales, login, cambios de empleados, vacaciones, documentos pendientes, correcciones.
- Preferencias de notificación configurables por usuario (`notif_login`, `notif_cambios`).
- Registro completo de empleados con historial de cargo y salario.
- Preservación de datos del formulario de empleado en `localStorage` ante cierre accidental.
- Almacenamiento en **AWS S3** con presigned URLs (foto, CV, contratos, certificados).
- Flujo de aprobación RRHH antes de confirmar documentos en S3 (temporal → activo).
- Formato y límite por tipo de documento (PDF/JPG/PNG/DOC, máx. 5 MB).
- Gestión de contratos (nuevo, renovar, terminar) con adendas y `cambios_json` (antes/después).
- Vencimiento automático de contratos vía job diario.
- Terminar contrato propaga estado `retirado` al empleado automáticamente.
- Vacaciones con cálculo automático, reglas de negocio y elegibilidad parametrizable.
- Justificaciones para estado inactivo y retirado (listas desplegables).
- Estado "transición" para empleados con contrato próximo a vencer.
- Festivos colombianos en BD (actualizables sin redespliegue).
- Departamentos y ciudades de Colombia desde JSON semilla.
- Módulo de departamentos del cargo (solo administrador).
- Reportes consolidados sin BD propia (patrón Aggregator, tolerancia a fallos).
- Exportación CSV con BOM UTF-8, logo de empresa y filtros.
- Trazabilidad completa: tipo_accion, IP, user_agent, empleado afectado, quién cambió qué.
- 4 dashboards independientes por rol con gráficas de torta, línea y barras.
- Super Admin Service con gestión multiempresa, flujo demo (máx. 2 activaciones, 1 dispositivo) y suscripción.
- Contrato PDF de servicio generado automáticamente al activar empresa.
- Migraciones versionadas automáticas en Docker con healthcheck.
- SonarCloud (cobertura mínima 60–80% según servicio).
- Pruebas unitarias (Jest/Vitest), E2E e integración (Playwright), performance (Grafana k6).

### No incluido en MVP

- Módulo de nómina y liquidaciones.
- App móvil nativa.
- Firma digital de contratos.
- Integración con Siigo / Alegra.

### Supuestos técnicos

- Cada microservicio tiene su propia BD independiente; las relaciones son **lógicas vía REST**.
- Los JWT se validan **localmente** en cada microservicio con el `JWT_SECRET` compartido — sin llamadas HTTP al Auth Service en cada petición.
- Los festivos colombianos se cargan como seed al iniciar por primera vez.
- Los días de vacaciones legales son 15 días hábiles por año (Código Sustantivo del Trabajo Colombia).
- Las migraciones corren automáticamente al iniciar cada contenedor Docker.
- El estado **"transición"** es diferente a "inactivo" (ausentismo temporal) y "retirado" (desvinculado definitivamente).

---

## 5. Riesgos y Mitigaciones

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|--------|-------|---------|------------|
| 1 | Pérdida de datos en BD | Media | Alto | Backups automáticos diarios |
| 2 | Token JWT comprometido | Baja | Alto | Refresh tokens con rotación + revocación en BD |
| 3 | Sesión activa tras logout | Media | Alto | `revocado=TRUE` al hacer logout; registrado en History |
| 4 | Inconsistencia en días disponibles | Media | Alto | Columna `GENERATED` en BD; actualización transaccional |
| 5 | Festivos hardcodeados desactualizados | Alta | Medio | Tabla `festivos` en BD actualizable sin redespliegue |
| 6 | Fallo en comunicación entre servicios | Media | Alto | Timeouts + fire-and-forget para auditoría + 503 controlados |
| 7 | Archivos S3 expuestos | Media | Alto | Objetos privados + presigned URLs con expiración |
| 8 | Deuda técnica acumulada | Alta | Medio | SonarCloud en cada PR + cobertura mínima configurada |
| 9 | Migración de BD falla en Docker | Media | Alto | `depends_on: condition: service_healthy` + migraciones idempotentes |
| 10 | Despliegue fallido en producción | Media | Alto | CI/CD con GitHub Actions + ambiente staging |
| 11 | Correos con dominio inexistente | Media | Alto | Validación de correo real al registrar (SMTP check) |
| 12 | Pérdida de formulario por cierre accidental | Alta | Medio | Persistencia en `localStorage` mientras el formulario esté abierto |
| 13 | Documentos subidos sin control | Media | Alto | Flujo de aprobación RRHH antes de confirmar en S3 definitivo |
| 14 | Auditoría incompleta | Media | Alto | History Service captura siempre `ip_origen` y `user_agent` |
| 15 | Demo usada ilimitadamente | Alta | Medio | Máx. 2 activaciones por empresa, 1 dispositivo simultáneo |
| 16 | Más de 2 super admins | Alta | Alto | Validación en BD + desactivación automática del link de registro |

---

## 6. Arquitectura del Sistema

### Tecnologías por capa

| Capa | Tecnología | Justificación |
|------|-----------|--------------|
| Frontend | React + Vite + TailwindCSS | SPA moderna, componentes reutilizables |
| Backend | Node.js + TypeScript + Express 5 | Liviano, tipado fuerte, ideal para microservicios REST |
| Base de datos | PostgreSQL 14+ | Relacional, ACID, una instancia por servicio |
| Migraciones | node-pg-migrate (TypeScript) | Versionado de esquema, idempotente en Docker |
| Validación | Zod | Esquemas tipados en runtime para DTOs |
| Almacenamiento | AWS S3 | Escalable para binarios (fotos, CVs, contratos, certificados) |
| Autenticación | JWT + Refresh Tokens | Stateless + logout real con revocación y rotación |
| Notificaciones | Nodemailer + Gmail SMTP | Correos reales para credenciales, vacaciones, cambios, documentos |
| Contenedores | Docker + Docker Compose | Portabilidad y consistencia |
| CI/CD | GitHub Actions | Automatización de pruebas y despliegue |
| Calidad | SonarCloud | Análisis estático, cobertura mínima 60–80% por servicio |
| Pruebas unitarias | Jest (auth, employee, contract, vacation) / Vitest (report, super-admin) | Cobertura alta con mocks aislados |
| Pruebas E2E | Playwright | Flujos completos e integración de APIs |
| Performance | Grafana k6 | Pruebas de carga y estrés |
| Despliegue | Render / Railway / Vercel | PaaS con URL pública |

### Comunicación entre microservicios

```
Super Admin Service (3007)
  └─→ Auth Service :3001       crea usuarios admin de empresa
  └─→ Employee Service :3002   consulta lista de empleados y estados
  └─→ History Service :3006    consulta auditoría global
                               (fire-and-forget para escritura)

Auth Service (3001)
  └─→ Employee Service :3002   verifica si correo existe como empleado (rol consulta)
  └─→ History Service :3006    registra login, logout, logout_all, token_renovado
                               (fire-and-forget)

Employee Service (3002)
  └─→ History Service :3006    registra cambios con tipo_accion, empleado_id, ip, user_agent
                               (fire-and-forget)
  └─→ Contract Service :3003   consulta contrato activo del empleado (proxy)
  └─→ Auth Service :3001       notifica cambios de empleado para envío de correo
                               (fire-and-forget, endpoint interno)
  └─→ AWS S3                   sube/descarga archivos vía presigned URL

Contract Service (3003)
  └─→ Employee Service :3002   verifica que el empleado existe (GET)
  └─→ History Service :3006    registra creación, adendas, renovaciones, vencimientos
                               (fire-and-forget)
  └─→ AWS S3                   presigned URLs para contratos y adendas en PDF

Vacation Service (3004)
  └─→ Employee Service :3002   verifica que el empleado existe (GET)
  └─→ History Service :3006    registra solicitud, aprobación, rechazo
                               (fire-and-forget)
  └─→ SMTP                     envía correos reales a RRHH y al empleado

Report Service (3005)
  └─→ Employee, Contract, Vacation Services (GET — solo lectura, sin BD propia)
  └─→ History Service :3006    registra generación de reportes (fire-and-forget)

History Service (3006)
  └─→ No llama a ningún otro servicio — solo recibe y almacena (pasivo)
```

> **Fire-and-forget:** las llamadas de auditoría nunca bloquean la operación principal. Si el History Service no responde, se loguea un warning y la operación continúa.

---

## 7. Microservicios

El sistema está compuesto por **7 microservicios**:

| # | Servicio | Puerto | Base de datos | Framework de testing |
|---|----------|--------|---------------|---------------------|
| 1 | **Auth Service** | 3001 | `auth_db` | Jest + ts-jest |
| 2 | **Employee Service** | 3002 | `employee_db` | Jest + ts-jest |
| 3 | **Contract Service** | 3003 | `contract_db` | Jest + ts-jest |
| 4 | **Vacation Service** | 3004 | `vacation_db` | Jest |
| 5 | **Report Service** | 3005 | *(sin BD)* | Vitest |
| 6 | **History Service** | 3006 | `history_db` | — |
| 7 | **Super Admin Service** | 3007 | `superadmin_db` | Vitest |

### Auth Service — Flujos principales

```
Registro
  1. Validar body con Zod + normalizar email (lowercase.trim())
  2. Verificar correo real (SMTP check) y que no exista en BD
  3. Si rol=consulta: verificar que correo exista como empleado en Employee Service
  4. bcrypt.hash(password, 12 rounds) → INSERT en users
  5. Retornar 201

Login
  1. Buscar usuario por email → verificar is_active=true
  2. bcrypt.compare(password, password_hash)
  3. Generar access_token (JWT, 1h) con payload { sub, email, role }
  4. Generar refresh_token (crypto.randomBytes(64).hex)
  5. Guardar SHA-256(refresh_token) en refresh_tokens con ip_origin y user_agent
  6. UPDATE users.last_login = NOW()
  7. Registrar 'login' en History Service (fire-and-forget)
  8. Retornar { accessToken, refreshToken, user }

Refresh (rotación)
  1. SHA-256(refreshToken) → buscar en BD
  2. Verificar: existe, revoked=false, expires_at > ahora
  3. Revocar token actual → generar nuevo access_token y nuevo refresh_token
  4. Registrar 'token_renovado' en History (fire-and-forget)

Logout / Logout-All
  1. Marcar revocado=TRUE en uno o todos los refresh_tokens del usuario
  2. Registrar 'logout' o 'logout_all' en History (fire-and-forget)

Recuperación de contraseña
  1. Buscar usuario (respuesta genérica si no existe — anti-enumeración)
  2. SHA-256(token) guardado en password_reset_tokens (TTL 15 min)
  3. Enviar enlace {FRONTEND_URL}/reset-password?token=<token_en_claro>

Reset Password
  1. SHA-256(token) → verificar existe, used=false, no expirado
  2. bcrypt.hash(newPassword) → UPDATE password_hash
  3. Marcar token used=TRUE → revocar TODOS los refresh_tokens del usuario
```

### Employee Service — Modelo de empleado

**Validaciones de seguridad aplicadas en cada campo:**

- `cedula`: máx. 13 dígitos numéricos · `nombre`/`apellido`: solo letras, máx. 50 chars
- `correo_personal`: real y validado (requerido para crear cuenta Consultante)
- `celular`: máx. 15 dígitos numéricos · `telefono_fijo`: máx. 10 dígitos, mín. 7
- `direccion`: sanitizada contra SQL injection
- `ciudad`/`departamento`: desde API/JSON Colombia
- `nivel_educativo`: bachiller · tecnico · tecnólogo · universitario · especialista · magister · doctorado
- `salario`: máx. 100.000.000 COP

**Estados y justificaciones:**

| Estado | Descripción | Campos adicionales |
|--------|-------------|-------------------|
| `activo` | Trabajando actualmente | — |
| `inactivo` | Ausentismo temporal | Fecha, motivo (vacaciones/suspensión/incapacidad/licencias/calamidad/otro), justificación |
| `transicion` | Contrato próximo a vencer | — |
| `retirado` | Desvinculado definitivamente | Fecha retiro, motivo, justificación |

### Contract Service — Flujos principales

```
Nuevo contrato
  1. Validar empleado existe en Employee Service (GET)
  2. Verificar que no existe contrato activo para ese empleado
  3. Si archivo_s3_key informado → HeadObject en S3 para validar existencia
  4. INSERT en contratos (solo guarda s3_key, nunca URLs públicas)
  5. Registrar en History Service (fire-and-forget)

Renovar contrato (transaccional)
  → Contrato anterior activo pasa a vencido/terminado
  → Nuevo contrato queda activo

Terminar contrato
  → UPDATE contrato → terminado
  → Empleado pasa automáticamente a estado retirado
  → Motivo y justificación se propagan al registro del empleado

Adendas
  → Solo sobre contratos activos
  → cambios_json registra antes/después por campo (salario, fecha_fin, modalidad, etc.)
  → Aplica campos soportados directamente sobre el contrato activo

Job diario de vencimiento automático
  → Marca vencido todo contrato con estado=activo y fecha_fin < hoy
  → Cada vencimiento se registra en History Service
```

### Vacation Service — Reglas de negocio

```
Reglas validadas en businessRules.service:
  1. fecha_inicio >= hoy + 1 mes (anticipación mínima)
  2. días hábiles (excluyendo fines de semana y festivos de BD) >= 5
  3. empleado tiene días disponibles suficientes
  4. no solapamiento con otras solicitudes pendientes o aprobadas
  5. fecha_inicio no puede ser sábado, domingo ni festivo colombiano
  6. empleado cumple antigüedad mínima parametrizable (para Consultante)

Aprobar  → dias_usados += dias_habiles   · dias_pendientes -= dias_habiles
Rechazar → dias_pendientes -= dias_habiles
```

### Report Service — Patrón Aggregator (sin BD)

Agrega datos en tiempo real vía REST con `Promise.allSettled`. Si un microservicio falla, retorna esa sección como `null` con la descripción de la falla en el campo `advertencias`. Es completamente stateless: sin estado local, escalable horizontalmente sin coordinación.

### History Service — Catálogo completo de acciones

| Tipo de acción | Disparado por |
|----------------|--------------|
| `login` · `logout` · `logout_all` · `token_renovado` | Auth Service |
| `creacion_empleado` · `modificacion_empleado` · `cambio_cargo_salario` | Employee Service |
| `subida_documento` · `aprobacion_documento` · `solicitud_correccion` | Employee Service |
| `creacion_contrato` · `adenda_contrato` · `renovacion_contrato` · `terminacion_contrato` | Contract Service |
| `vencimiento_automatico_contrato` | Contract Service (job diario) |
| `solicitud_vacaciones` · `aprobacion_vacaciones` · `rechazo_vacaciones` | Vacation Service |
| `reporte_generado` | Report Service |
| `registro_empresa` · `activacion_empresa` · `aprobacion_demo` | Super Admin Service |

> Los endpoints de **escritura** del History Service no requieren JWT para no bloquear el flujo del llamador. Los de **consulta** requieren JWT con rol ADMIN o HR. La `INTERNAL_API_KEY` protege las escrituras internas.

### Super Admin Service — Flujos principales

```
Bootstrap (primer super admin)
  → POST /api/super-admin/register con header X-Register-Secret
  → Solo funciona mientras existan menos de 2 super admins en BD

Crear empresa con admins automáticos
  1. Validar NIT único
  2. INSERT en empresas
  3. Para i=1..2:
     a. Generar contraseña temporal (crypto.randomBytes)
     b. POST a Auth Service /auth/register (rol: 'admin')
     c. INSERT en admins_empresa
     d. Enviar email con credenciales al correo de la empresa
  4. Generar PDF de contrato de servicio y enviar por correo
  5. Retornar 201 con { empresa, admins }

Auditoría global
  → Llama al History Service y filtra por empresa, tipo_accion, rango de fechas
  → Retorna lista paginada de todos los eventos
```

---

## 8. Modelo de Datos

El sistema cuenta con **18 tablas** distribuidas en 6 bases de datos independientes.

### Auth DB — 3 tablas

```sql
CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20)  NOT NULL
                  CHECK (role IN ('ADMIN', 'HR', 'CONSULTATION')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMP(6),
  notif_login     BOOLEAN NOT NULL DEFAULT TRUE,
  notif_cambios   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMP(6) NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  ip_origin   VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMP(6) NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Employee DB — 4 tablas

```sql
CREATE TABLE departamentos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  codigo_dane VARCHAR(10),
  activo      BOOLEAN DEFAULT TRUE
);

CREATE TABLE empleados (
  id                     BIGSERIAL PRIMARY KEY,
  cedula                 VARCHAR(20) UNIQUE NOT NULL,
  tipo_documento         VARCHAR(30) CHECK (tipo_documento IN
                           ('cedula_ciudadania','cedula_extranjeria','pasaporte','tarjeta_identidad')),
  nombre                 VARCHAR(100) NOT NULL,
  apellido               VARCHAR(100) NOT NULL,
  genero                 VARCHAR(20) CHECK (genero IN ('masculino','femenino','otro','prefiero_no_decir')),
  fecha_nacimiento       DATE,
  celular                VARCHAR(20),
  telefono_fijo          VARCHAR(20),
  correo_personal        VARCHAR(150),
  correo_corporativo     VARCHAR(150) UNIQUE,
  direccion              TEXT,
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

CREATE TABLE cargos_salarios (
  id              BIGSERIAL PRIMARY KEY,
  empleado_id     BIGINT NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  cargo           VARCHAR(100) NOT NULL,
  departamento_id INT REFERENCES departamentos(id),
  salario         DECIMAL(12,2) NOT NULL CHECK (salario <= 100000000),
  tipo_salario    VARCHAR(30) DEFAULT 'fijo'
                  CHECK (tipo_salario IN ('fijo','variable','por_hora')),
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE,
  activo          BOOLEAN DEFAULT TRUE,
  motivo_cambio   TEXT,
  registrado_por  VARCHAR(150),
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documentos_empleado (
  id              BIGSERIAL PRIMARY KEY,
  empleado_id     BIGINT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL CHECK (tipo IN
                    ('foto','hoja_vida','cert_salud','cert_pension','cert_cesantias',
                     'cert_riesgos','antecedentes','diploma','contrato_firmado','otro')),
  s3_key          TEXT NOT NULL,
  content_type    VARCHAR(100) CHECK (content_type IN
                    ('image/jpeg','image/png','application/pdf','application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  nombre_original VARCHAR(255),
  tamano_bytes    BIGINT CHECK (tamano_bytes <= 5242880),
  estado          VARCHAR(30) DEFAULT 'pendiente_aprobacion'
                  CHECK (estado IN ('pendiente_aprobacion','activo','rechazado')),
  motivo_rechazo  TEXT,
  aprobado_por    VARCHAR(150),
  subido_por      VARCHAR(150),
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Contract DB — 2 tablas

```sql
CREATE TABLE contratos (
  id                BIGSERIAL PRIMARY KEY,
  empleado_id       BIGINT NOT NULL,
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
  archivo_s3_key    TEXT,
  estado            VARCHAR(20) DEFAULT 'activo'
                    CHECK (estado IN ('activo','vencido','terminado','suspendido')),
  creado_por        VARCHAR(150),
  created_at        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE adendas_contratos (
  id              BIGSERIAL PRIMARY KEY,
  contrato_id     BIGINT NOT NULL REFERENCES contratos(id) ON DELETE RESTRICT,
  numero_adenda   INT NOT NULL,
  descripcion     TEXT NOT NULL,
  cambios_json    JSONB,
  fecha_vigencia  DATE NOT NULL,
  archivo_s3_key  TEXT,
  creado_por      VARCHAR(150),
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (contrato_id, numero_adenda)
);
```

### Vacation DB — 3 tablas

```sql
CREATE TABLE vacaciones (
  id               BIGSERIAL PRIMARY KEY,
  empleado_id      BIGINT NOT NULL,
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE NOT NULL,
  dias_habiles     INT NOT NULL,
  dias_calendario  INT NOT NULL,
  estado           VARCHAR(20) DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','aprobada','rechazada','cancelada')),
  justificacion    TEXT,
  motivo_rechazo   TEXT,
  aprobado_por     VARCHAR(150),
  fecha_aprobacion TIMESTAMP,
  notificado       BOOLEAN DEFAULT FALSE,
  fecha_solicitud  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Columna dias_disponibles calculada automáticamente (GENERATED)
CREATE TABLE dias_disponibles (
  id               BIGSERIAL PRIMARY KEY,
  empleado_id      BIGINT NOT NULL,
  anio             INT NOT NULL,
  dias_totales     DECIMAL(5,1) NOT NULL,
  dias_usados      DECIMAL(5,1) DEFAULT 0,
  dias_pendientes  DECIMAL(5,1) DEFAULT 0,
  dias_disponibles DECIMAL(5,1) GENERATED ALWAYS AS
                   (dias_totales - dias_usados - dias_pendientes) STORED,
  created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (empleado_id, anio)
);

CREATE TABLE festivos (
  id          BIGSERIAL PRIMARY KEY,
  fecha       DATE NOT NULL UNIQUE,
  descripcion VARCHAR(150) NOT NULL,
  anio        INT NOT NULL,
  tipo        VARCHAR(50) DEFAULT 'nacional'
              CHECK (tipo IN ('nacional','regional','empresarial')),
  activo      BOOLEAN DEFAULT TRUE
);
-- Incluye seed con 18 festivos colombianos 2025
```

### History DB — 2 tablas

```sql
CREATE TABLE historial_cambios (
  id                   BIGSERIAL PRIMARY KEY,
  empleado_id          BIGINT NOT NULL,
  entidad              VARCHAR(50) NOT NULL,
  entidad_id           INT,
  campo_modificado     VARCHAR(100) NOT NULL,
  valor_anterior       TEXT,
  valor_nuevo          TEXT,
  usuario_modificador  VARCHAR(150) NOT NULL,
  rol_modificador      VARCHAR(50),
  ip_origen            VARCHAR(45),
  user_agent           TEXT,
  fecha_modificacion   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE acciones_sistema (
  id            BIGSERIAL PRIMARY KEY,
  usuario_email VARCHAR(150),
  rol           VARCHAR(50),
  accion        VARCHAR(100) NOT NULL,
  entidad       VARCHAR(50),
  entidad_id    INT,
  resultado     VARCHAR(20) DEFAULT 'exitoso'
                CHECK (resultado IN ('exitoso','fallido','denegado')),
  detalle       TEXT,
  ip_origen     VARCHAR(45),
  user_agent    TEXT,
  fecha         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Super Admin DB — 4 tablas

```sql
CREATE TYPE plan_enum           AS ENUM ('basico', 'profesional', 'enterprise');
CREATE TYPE estado_empresa_enum AS ENUM ('activa', 'inactiva', 'suspendida');

CREATE TABLE super_admins (
  id                  BIGSERIAL PRIMARY KEY,
  nombre              VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login        TIMESTAMP,
  reset_token         VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE empresas (
  id         BIGSERIAL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  nit        VARCHAR(20) NOT NULL UNIQUE,
  correo     VARCHAR(150) NOT NULL,
  telefono   VARCHAR(20),
  plan       plan_enum NOT NULL DEFAULT 'basico',
  estado     estado_empresa_enum NOT NULL DEFAULT 'activa',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins_empresa (
  id         BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  email      VARCHAR(150) NOT NULL,
  nombre     VARCHAR(100),
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (empresa_id, email)
);

CREATE TABLE refresh_tokens_superadmin (
  id             BIGSERIAL PRIMARY KEY,
  super_admin_id BIGINT NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  token_hash     VARCHAR(255) NOT NULL UNIQUE,
  expires_at     TIMESTAMP NOT NULL,
  revocado       BOOLEAN NOT NULL DEFAULT FALSE,
  ip_origen      VARCHAR(50),
  user_agent     TEXT,
  created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Resumen del modelo de datos

| Servicio | Tablas | Cant. |
|----------|--------|:-----:|
| **Auth** | `users`, `refresh_tokens`, `password_reset_tokens` | 3 |
| **Employee** | `empleados`, `cargos_salarios`, `documentos_empleado`, `departamentos` | 4 |
| **Contract** | `contratos`, `adendas_contratos` | 2 |
| **Vacation** | `vacaciones`, `dias_disponibles`, `festivos` | 3 |
| **History** | `historial_cambios`, `acciones_sistema` | 2 |
| **Report** | *(sin BD propia)* | 0 |
| **Super Admin** | `super_admins`, `empresas`, `admins_empresa`, `refresh_tokens_superadmin` | 4 |
| | **Total** | **18** |

---

## 9. Almacenamiento de Archivos — AWS S3

### ¿Por qué S3 y no BYTEA en PostgreSQL?

| Criterio | BYTEA | AWS S3 |
|----------|-------|--------|
| Escalabilidad | BD crece y se vuelve lenta | Prácticamente ilimitada |
| Costo | Alto | ~$0.023 USD/GB/mes |
| Velocidad | Lenta (pasa por BD) | Alta (CDN disponible) |
| Backups | BD más pesada | Independiente de BD |

### Estructura de carpetas S3

```
hr-system-empleados/
├── fotos/
├── hojas-de-vida/
├── contratos-firmados/
│   └── empleados/:id/contratos/
│       └── adendas/
├── certificados/
│   └── (salud, pension, cesantias, riesgos, antecedentes, diplomas)
└── temporal/          ← documentos pendientes de aprobación RRHH
```

### Flujo de subida — documentos de empleados (3 pasos)

```
Paso A — Obtener presigned URL
  POST /api/empleados/presigned-url
  → Valida formato (PDF/JPG/PNG/DOC) y tamaño (máx. 5 MB)
  → Genera URL de subida hacia S3 /temporal/ (válida 5 min)

Paso B — PUT directo del frontend a S3 (NO pasa por el backend)
  → El archivo físico llega directamente a S3

Paso C — Confirmar documento en BD
  POST /api/empleados/:id/documentos
  → Crea registro con estado: pendiente_aprobacion
  → Correo real a RRHH notificando el documento pendiente

Aprobación → PATCH /empleados/:id/documentos/:docId/aprobar
  → Mueve de /temporal/ a ruta definitiva en S3
  → Estado: activo

Rechazo → PATCH /empleados/:id/documentos/:docId/rechazar
  → Elimina el archivo de S3 /temporal/
  → Estado: rechazado + motivo enviado al solicitante

Descarga → GET /empleados/documentos/:docId/url
  → Genera presigned URL de descarga (válida 1 hora)
```

### Flujo de subida — contratos y adendas

```
POST /api/contratos/presigned-url   → URL de subida (válida 5 min)
PUT  directo del frontend a S3
POST /api/contratos                 → HeadObject valida existencia antes de crear
                                    → Solo guarda archivo_s3_key, nunca URLs públicas
GET  /api/contratos/:id/documento/url → URL de descarga temporal (1 hora)
```

### Política IAM mínima requerida

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:HeadObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::hr-system-empleados/*"
}
```

---

## 10. API REST

> Swagger: `[URL pendiente]` · Postman Collection: `[URL pendiente]`

### Auth Service — `/api/v1`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Registrar usuario (con validación de correo real) | ❌ |
| POST | `/auth/login` | Login → access_token + refresh_token | ❌ |
| POST | `/auth/refresh` | Renovar tokens (rotación) | ❌ |
| POST | `/auth/logout` | Revocar sesión actual | ❌ (body: refreshToken) |
| POST | `/auth/logout-all` | Revocar todas las sesiones | ✅ JWT |
| POST | `/auth/forgot-password` | Solicitar recuperación por email | ❌ |
| POST | `/auth/reset-password` | Restablecer contraseña (token 15 min) | ❌ |
| GET | `/users` | Listar usuarios | ✅ ADMIN |
| GET | `/users/:id` | Detalle de usuario | ✅ ADMIN, HR |
| PATCH | `/users/:id/activate` | Activar usuario | ✅ ADMIN |
| PATCH | `/users/:id/deactivate` | Desactivar usuario | ✅ ADMIN |
| GET | `/protected/profile` | Perfil del usuario autenticado | ✅ JWT |
| POST | `/protected/change-password` | Cambiar contraseña (requiere actual) | ✅ JWT |
| GET | `/protected/preferences` | Preferencias de notificación | ✅ JWT |
| PATCH | `/protected/preferences` | Actualizar preferencias | ✅ JWT |
| POST | `/internal/notify-employee-change` | Recibe evento y envía correo | 🔒 x-internal-key |

### Employee Service — `/api/empleados`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/` | Listar empleados con filtros y búsqueda | ADMIN, HR |
| GET | `/:id` | Detalle del empleado | ADMIN, HR |
| GET | `/me` | Propio perfil del Consultante | CONSULTATION |
| POST | `/` | Registrar empleado (+ cuenta Consultante automática) | ADMIN, HR |
| PATCH | `/:id` | Editar datos de identidad | ADMIN, HR |
| DELETE | `/:id` | Eliminar empleado (con confirmación) | **Solo ADMIN** |
| POST | `/:id/solicitar-correccion` | Solicitud de cambio de información | Todos |
| GET | `/:id/cargo-actual` | Cargo y salario actual | Todos |
| GET | `/:id/historial-cargo` | Historial completo de cargos | ADMIN, HR |
| POST | `/:id/cargo` | Registrar nuevo cargo/salario | ADMIN, HR |
| GET | `/:id/contrato-activo` | Proxy al Contract Service | Todos |
| POST | `/presigned-url` | Generar URL de subida a S3 | ADMIN, HR |
| GET | `/:id/documentos` | Listar documentos del empleado | Todos |
| POST | `/:id/documentos` | Confirmar documento subido a S3 | ADMIN, HR |
| PATCH | `/:id/documentos/:docId/aprobar` | Aprobar documento → S3 definitivo | ADMIN, HR |
| PATCH | `/:id/documentos/:docId/rechazar` | Rechazar documento temporal | ADMIN, HR |
| GET | `/documentos/:docId/url` | URL de descarga S3 (1 hora) | Todos |
| GET | `/export/csv` | Exportar listado CSV organizado | ADMIN, HR |
| GET | `/departamentos` | Departamentos y ciudades de Colombia | Todos |

### Contract Service — `/api/contratos`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/` | Listar contratos | Todos |
| GET | `/:id` | Detalle de contrato + adendas | Todos |
| GET | `/empleado/:id` | Contratos de un empleado | Todos |
| GET | `/empleado/:id/activo` | Contrato activo de un empleado | Todos |
| GET | `/me/latest` | Último contrato propio (Consultante) | CONSULTATION |
| POST | `/` | Crear contrato (valida empleado + HeadObject S3) | ADMIN, HR |
| POST | `/renovaciones` | Renovar contrato (transaccional) | ADMIN, HR |
| POST | `/:id/terminar` | Terminar contrato de forma inmediata | ADMIN, HR |
| POST | `/presigned-url` | URL de subida para PDF de contrato | ADMIN, HR |
| GET | `/:id/documento/url` | URL de descarga del contrato (1 hora) | Todos |
| POST | `/:id/adendas` | Agregar adenda con cambios_json | ADMIN, HR |
| GET | `/:id/adendas` | Listar adendas del contrato | Todos |
| POST | `/:id/adendas/presigned-url` | URL de subida para PDF de adenda | ADMIN, HR |
| GET | `/:id/adendas/:amendmentId/documento/url` | URL de descarga de adenda (1 hora) | Todos |

### Vacation Service — `/api/vacaciones`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/empleado/:id` | Historial de vacaciones | Todos |
| GET | `/me/eligibility` | Estado de elegibilidad del Consultante | CONSULTATION |
| GET | `/empleado/:id/disponibles` | Días disponibles del año actual | Todos |
| POST | `/` | Solicitar vacaciones | ADMIN, HR, CONSULTATION |
| PATCH | `/:id/aprobar` | Aprobar solicitud | ADMIN, HR |
| PATCH | `/:id/rechazar` | Rechazar con motivo | ADMIN, HR |
| PATCH | `/:id/cancelar` | Cancelar solicitud pendiente | ADMIN, HR |
| GET | `/festivos/:anio` | Festivos de un año | Todos |
| POST | `/festivos` | Agregar festivo | ADMIN |

### Report Service — `/api/reportes`

| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/empleado/:id` | Ficha completa (datos + cargo + contratos + vacaciones) | ADMIN, HR |
| GET | `/estado-laboral` | Empleados activos con cargo y días disponibles | Todos |
| GET | `/vacaciones` | Resumen de vacaciones con filtros opcionales | Todos |
| GET | `/contratos` | Contratos por tipo y estado | Todos |
| GET | `/turnover` | Empleados retirados en un rango de fechas | ADMIN |
| GET | `/empleados/csv` | Exportación CSV (BOM UTF-8, compatible Excel) | ADMIN, HR |

### History Service — `/api/historial`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/cambios` | Registrar cambio de campo | 🔒 x-internal-key |
| POST | `/acciones` | Registrar acción del sistema | 🔒 x-internal-key |
| GET | `/cambios/empleado/:id` | Historial de un empleado (con filtros) | ✅ ADMIN, HR |
| GET | `/cambios` | Listado general con filtros | ✅ ADMIN |
| GET | `/acciones` | Log de acciones del sistema | ✅ ADMIN |
| GET | `/health` | Estado del servicio | ❌ |

### Super Admin Service — `/api/super-admin`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Bootstrap del primer super admin | 🔒 X-Register-Secret |
| POST | `/login` | Login → access + refresh token | ❌ |
| POST | `/refresh` | Renovar tokens (rotación) | ❌ |
| POST | `/logout` | Revocar sesión actual | ✅ JWT super admin |
| POST | `/recover-password` | Solicitar recuperación por email | ❌ |
| POST | `/reset-password` | Restablecer contraseña | ❌ |
| GET | `/empresas` | Listar empresas (paginado, incluye admins) | ✅ JWT super admin |
| POST | `/empresas` | Crear empresa + 2 admins automáticos | ✅ JWT super admin |
| GET | `/empresas/:id` | Detalle de empresa con admins | ✅ JWT super admin |
| PATCH | `/empresas/:id` | Actualizar nombre, correo, teléfono, plan | ✅ JWT super admin |
| PATCH | `/empresas/:id/estado` | Cambiar estado (activa/inactiva/suspendida) | ✅ JWT super admin |
| POST | `/empresas/:id/admins` | Agregar admin (máx. 2 activos) | ✅ JWT super admin |
| GET | `/empresas/:id/empleados` | Empleados de la empresa con detalle_estado | ✅ JWT super admin |
| GET | `/auditoria/acciones` | Acciones globales del History Service | ✅ JWT super admin |
| GET | `/auditoria/cambios` | Cambios de entidades globales | ✅ JWT super admin |

### Códigos de estado HTTP

| Código | Significado |
|--------|-------------|
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

## 11. Migraciones de Base de Datos

Las migraciones corren **automáticamente al iniciar cada contenedor Docker** usando `node-pg-migrate` con TypeScript. Son idempotentes: si ya se ejecutaron, no vuelven a correr.

```json
// package.json de cada servicio
{
  "scripts": {
    "migrate":      "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "start":        "npm run migrate && node dist/server.js",
    "dev":          "npm run migrate && ts-node-dev src/server.ts"
  }
}
```

### Estructura de migraciones por servicio

```
auth-service/migrations/
├── 001_create_users.ts
├── 002_create_refresh_tokens.ts
├── 1777862763125_create-password-reset-tokens.ts
└── 1778200000000_add-notification-prefs.ts

employee-service/migrations/
├── 001_create_empleados.ts
├── 002_create_cargos_salarios.ts
└── 003_create_documentos_empleado.ts

contract-service/migrations/
├── 20260503120000000_create_contract.ts
├── 20260503120100000_create_contract_amendments.ts
└── 20260505152000000_align_contract_integrations.ts

vacation-service/migrations/
├── 001_create_festivos.ts
├── 002_create_vacaciones.ts
├── 003_create_dias_disponibles.ts
└── 004_seed_festivos_2025.ts           ← 18 festivos colombianos

history-service/migrations/
├── 001_create_historial_cambios.ts
└── 002_create_acciones_sistema.ts

super-admin-service/migrations/
├── 001_create_super_admins.ts
├── 002_create_empresas.ts
├── 003_create_admins_empresa.ts
└── 004_create_refresh_tokens_superadmin.ts
```

### Docker Compose con healthcheck

```yaml
auth-service:
  build: ./auth-service
  ports: ["3001:3001"]
  depends_on:
    postgres-auth:
      condition: service_healthy
  restart: on-failure

postgres-auth:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: auth_db
    POSTGRES_USER: postgres
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
  postgres_superadmin_data:
```

> Los `volumes` garantizan que los datos persistan aunque el contenedor se reinicie.

---

## 12. Seguridad

- Contraseñas hasheadas con **bcrypt** (12 salt rounds). Nunca en texto plano.
- **JWT** firmado con secret ≥ 32 caracteres, expiración 1 hora.
- **Refresh tokens** almacenados como hash SHA-256 en BD. Nunca el token en claro.
- Refresh token con **rotación**: cada renovación genera un par nuevo y revoca el anterior.
- Logout real con `revocado=TRUE`. `logout-all` invalida todas las sesiones activas.
- Reset de contraseña revoca **todos** los refresh tokens del usuario.
- **Validación de correo real** al registrar (SMTP check o servicio externo).
- **Rol consulta** restringido a empleados con correo registrado en el sistema.
- Los JWT se validan **localmente** en cada microservicio — sin llamadas HTTP al Auth Service en cada petición (stateless y eficiente).
- Archivos S3 **privados por defecto**. Lectura solo vía presigned URLs con expiración.
- **HeadObject** en S3 antes de crear contratos o adendas — valida que el archivo exista.
- Solo se guarda `s3_key` en BD, nunca URLs públicas permanentes.
- **Flujo de aprobación RRHH** para documentos antes de confirmarlos como activos.
- Política IAM con mínimo privilegio por servicio.
- Variables sensibles exclusivamente en `.env` (nunca en código). `.env` en `.gitignore`.
- CORS restringido por `CORS_ORIGINS`. Sin CORS abierto en producción.
- Escritura interna al History Service protegida con `INTERNAL_API_KEY` (`x-internal-key`).
- Endpoint de bootstrap del Super Admin protegido por `REGISTER_SECRET` — nunca expuesto al público.
- Máximo 2 super admins globalmente — validado en BD y desactivando el link de registro.
- Demo limitada a **1 dispositivo simultáneo** y máximo **2 activaciones** por empresa.
- Campos de texto libre sanitizados contra SQL injection.
- Valores de usuario en correos HTML pasados por `escapeHtml()` (previene XSS en plantillas de email).
- Campos numéricos con límites explícitos: cédula máx. 13 dígitos, celular máx. 15, salario máx. 100M COP.
- **HTTPS obligatorio** en producción.
- **SonarCloud** analiza vulnerabilidades en cada PR (cobertura mínima 60–80% según servicio).
- Respuestas de error en `NODE_ENV=production` no incluyen stack trace ni mensajes internos.
- Anti-enumeración en recuperación de contraseña: respuesta genérica independiente de si el email existe.

---

## 13. Pruebas

### Estrategia general

```
E2E — Playwright (flujos completos por rol)
  └─ Integración — Playwright API Testing
       └─ Unitarias — Jest / Vitest (lógica de negocio aislada)
            └─ Performance — Grafana k6 (Load + Stress)
```

### Cobertura por servicio

| Servicio | Framework | Umbral configurado | Cobertura actual |
|----------|-----------|-------------------|-----------------|
| Auth Service | Jest + ts-jest | 60% mínimo | ~80%+ |
| Employee Service | Jest + ts-jest | 90% stmt / 80% branches | ~99% / ~96% |
| Contract Service | Jest + ts-jest | — | Pruebas implementadas |
| Vacation Service | Jest | — | Pruebas implementadas |
| Report Service | Vitest | 80% stmt / 70% branches | **100% / 95.74%** (85 tests) |
| History Service | — | — | — |
| Super Admin Service | Vitest | 80% stmt / 70% branches | Pruebas implementadas |

### Casos clave — Auth Service

| ID | Caso | Tipo |
|----|------|------|
| TC-AUTH-001 | Login exitoso → access_token + refresh_token | Positivo |
| TC-AUTH-002 | Contraseña incorrecta → 401 | Negativo |
| TC-AUTH-003 | Refresh con rotación → nuevos tokens | Positivo |
| TC-AUTH-004 | Refresh revocado → 401 | Negativo |
| TC-AUTH-005 | Logout revoca token y registra `logout` en History | Positivo |
| TC-AUTH-006 | Logout-all revoca todos y registra `logout_all` | Positivo |
| TC-AUTH-007 | Endpoint protegido sin token → 401 | Negativo |
| TC-AUTH-008 | Registro con correo inexistente → 400 | Negativo |
| TC-AUTH-009 | Rol consulta sin ser empleado → 403 | Negativo |
| TC-AUTH-010 | Reset con token expirado → 401 | Negativo |

### Casos clave — Employee Service (128 tests unitarios)

| ID | Caso | Tipo |
|----|------|------|
| TC-EMP-001 | Registrar empleado completo → 201 | Positivo |
| TC-EMP-002 | Cédula duplicada → 409 | Negativo |
| TC-EMP-003 | Nuevo cargo cierra el anterior (activo=false) | Positivo |
| TC-EMP-004 | Filtros de estado (activo/inactivo/transicion/retirado) | Positivo |
| TC-EMP-005 | Búsqueda > 50 chars → 400 | Negativo |
| TC-EMP-006 | Documento > 5 MB → 400 | Negativo |
| TC-EMP-007 | Documento con formato inválido → 400 | Negativo |
| TC-EMP-008 | Aprobación → estado activo en BD y S3 definitivo | Positivo |
| TC-EMP-009 | Exportación CSV con cada campo en su columna | Positivo |
| TC-EMP-010 | Editar con rol CONSULTATION → 403 | Negativo |
| TC-EMP-011 | Eliminar empleado con rol HR → 403 | Negativo |

### Casos clave — Contract Service

| ID | Caso | Tipo |
|----|------|------|
| TC-CON-001 | Crear contrato con empleado válido y archivo en S3 | Positivo |
| TC-CON-002 | Crear cuando ya existe contrato activo → 409 | Negativo |
| TC-CON-003 | Renovación cierra contrato anterior (transaccional) | Positivo |
| TC-CON-004 | Terminar contrato → empleado pasa a retirado | Positivo |
| TC-CON-005 | Adenda aplica cambios_json sobre contrato activo | Positivo |
| TC-CON-006 | Job diario marca vencido contrato con fecha_fin pasada | Positivo |

### Casos clave — Vacation Service

| ID | Caso | Tipo |
|----|------|------|
| TC-VAC-001 | 5 días hábiles con 1 mes anticipación → 201 | Positivo |
| TC-VAC-002 | Menos de 5 días hábiles → 400 | Negativo |
| TC-VAC-003 | Sin 1 mes de anticipación → 400 | Negativo |
| TC-VAC-004 | Más días de los disponibles → 400 | Negativo |
| TC-VAC-005 | Fecha inicio en festivo colombiano → 400 | Negativo |
| TC-VAC-006 | Aprobar → `dias_usados` se actualiza correctamente | Positivo |
| TC-VAC-007 | Rechazar → `dias_pendientes` se libera | Positivo |
| TC-VAC-008 | Consultante sin antigüedad → aviso de elegibilidad | Positivo |

### Casos clave — Report Service (Vitest, 85 tests, cobertura 100%)

| Archivo | Tests | Qué cubre |
|---------|:-----:|-----------|
| `report.service.test.ts` | 22 | Agregación paralela, tolerancia a fallos, filtros, CSV |
| `report.controller.test.ts` | 12 | Todos los endpoints + propagación de errores |
| `auth.middleware.test.ts` | 9 | verifyToken, requireRol (403/401) |
| `error-handler.middleware.test.ts` | 7 | AppError vs errores genéricos, dev/prod mode |
| `report-formatter.util.test.ts` | 14 | CSV, escaping, BOM UTF-8, compatibilidad Excel |
| `historyClient.test.ts` | 4 | Fire-and-forget: nunca lanza aunque axios rechace |

### Pruebas de performance con Grafana k6

```bash
# Prueba de carga — Employee Service
k6 run \
  --env BASE_URL=http://localhost:3002 \
  --env AUTH_URL=http://localhost:3001 \
  tests/performance/load/employees-load.js

# Prueba de estrés — Vacation Service
k6 run tests/performance/stress/vacations-stress.js
```

**Umbrales (thresholds):**

| Métrica | Umbral |
|---------|--------|
| `http_req_duration p(95)` | < 500ms |
| `http_req_duration p(99)` | < 1000ms |
| `http_req_failed` | < 1% |
| `checks` | 100% OK |

---

## 14. Guía de Ejecución

### Requisitos previos

| Herramienta | Versión mínima |
|------------|---------------|
| Node.js | 18.x |
| Docker | 24.x |
| Docker Compose | 2.x |
| Git | 2.x |
| k6 | 0.49.x |
| Cuenta AWS | — (para S3) |

### Levantar el sistema completo

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/hr-system-backend.git
cd hr-system-backend

# 2. Copiar archivos de entorno de cada servicio
for svc in auth employee contract vacation report history super-admin; do
  cp ${svc}-service/.env.example ${svc}-service/.env
done
# Editar cada .env con los valores reales

# 3. Levantar todos los servicios (migraciones corren automáticamente)
docker-compose up --build

# 4. Verificar estado
docker-compose ps
docker-compose logs employee-service | grep -i "seed\|migrat"

# 5. Crear el primer Super Admin (solo una vez, bootstrap)
curl -X POST http://localhost:3007/api/super-admin/register \
  -H "Content-Type: application/json" \
  -H "X-Register-Secret: <valor de REGISTER_SECRET en .env>" \
  -d '{"nombre":"Super Admin","email":"superadmin@empresa.com","password":"Segura#1234"}'
```

### Variables de entorno clave

```env
# ── Compartidas por todos los servicios ──────────────────────────────────────
JWT_SECRET=minimo_32_caracteres_muy_seguro_aqui_1234
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_DAYS=7
CORS_ORIGINS=http://localhost:5173
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion

# ── Auth Service (:3001) ──────────────────────────────────────────────────────
PORT=3001
DATABASE_URL=postgres://postgres:password@postgres-auth:5432/auth_db
BCRYPT_SALT_ROUNDS=12
RESET_TOKEN_EXPIRES_MINUTES=15
FRONTEND_URL=http://localhost:5173
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=app_password_16_chars   # App Password de Gmail, no la contraseña de la cuenta

# ── Employee Service (:3002) ──────────────────────────────────────────────────
PORT=3002
DATABASE_URL=postgres://postgres:password@postgres-employee:5432/employee_db
CONTRACT_SERVICE_URL=http://contract-service:3003
HISTORY_SERVICE_URL=http://history-service:3006
AUTH_SERVICE_URL=http://auth-service:3001/api/v1
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=hr-system-empleados
RRHH_EMAIL=rrhh@empresa.com

# ── Contract Service (:3003) ──────────────────────────────────────────────────
PORT=3003
DATABASE_URL=postgres://postgres:password@postgres-contract:5432/contract_db
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=admin-employee-microservice

# ── Vacation Service (:3004) ──────────────────────────────────────────────────
PORT=3004
DATABASE_URL=postgres://postgres:password@postgres-vacation:5432/vacation_db
EMPLOYEE_SERVICE_URL=http://employee-service:3002
HISTORY_SERVICE_URL=http://history-service:3006
DIAS_LEGALES_ANUALES=15
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rrhh@empresa.com
SMTP_PASS=app_password_16_chars
FRONTEND_URL=http://localhost:5173

# ── Report Service (:3005) ────────────────────────────────────────────────────
PORT=3005
EMPLOYEE_SERVICE_URL=http://employee-service:3002/api
CONTRACT_SERVICE_URL=http://contract-service:3003/api
VACATION_SERVICE_URL=http://vacation-service:3004/api
HISTORY_SERVICE_URL=http://history-service:3006
REQUEST_TIMEOUT_MS=8000

# ── History Service (:3006) ───────────────────────────────────────────────────
PORT=3006
DATABASE_URL=postgres://postgres:password@postgres-history:5432/history_db

# ── Super Admin Service (:3007) ───────────────────────────────────────────────
PORT=3007
DATABASE_URL=postgres://postgres:password@postgres-superadmin:5432/superadmin_db
JWT_SECRET=minimo_32_caracteres_superadmin_muy_seguro_aqui
REGISTER_SECRET=clave_secreta_para_crear_primer_superadmin
AUTH_SERVICE_URL=http://auth-service:3001/api/v1
EMPLOYEE_SERVICE_URL=http://employee-service:3002/api
HISTORY_SERVICE_URL=http://history-service:3006
RESET_TOKEN_EXPIRES_MINUTES=15
FRONTEND_URL=http://localhost:5173
```

> Consultar el `.env.example` de cada servicio para la lista completa de variables.

### Ejecutar pruebas

```bash
# Pruebas unitarias por servicio
cd auth-service         && npm test
cd employee-service     && npm test
cd contract-service     && npm test
cd vacation-service     && npm test
cd report-service       && npm test
cd super-admin-service  && npm test

# Con reporte de cobertura
npm run test:coverage

# E2E e integración con Playwright
cd hr-system-tests && npx playwright test

# Performance con k6
k6 run --env BASE_URL=http://localhost:3002 \
       --env AUTH_URL=http://localhost:3001 \
       performance/load/employees-load.js
```

### Solución de problemas comunes

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `Missing required environment variable: JWT_SECRET` | Falta el `.env` | Copiar `.env.example` → `.env` |
| `401 Token inválido o expirado` | JWT_SECRET distinto entre servicios | Verificar que todos los servicios usen el mismo secreto |
| `ECONNREFUSED localhost:300X` | Servicio dependiente no está corriendo | Iniciar el servicio correspondiente primero |
| Reporte retorna datos parciales | Un microservicio dependiente falló | Ver campo `advertencias` en la respuesta |
| `409 La empresa ya tiene el máximo de 2 admins` | Se alcanzó el límite | Desactivar un admin existente antes de agregar uno nuevo |

---

## 15. Diseño de Pantallas

> Mockups en Figma: `[Agregar enlace]`

| Pantalla | Roles |
|----------|-------|
| Login (4 accesos diferenciados según rol) | Todos |
| Dashboard Super Admin (gráficas, demos, empresas, últimas acciones) | Super Admin |
| Dashboard Admin / RRHH (métricas empresa, gráficas, actividad reciente) | Admin, RRHH |
| Dashboard Consultante (perfil simplificado) | Consultante |
| Lista de Empleados (filtros de estado, búsqueda, exportar CSV) | Admin, RRHH |
| Formulario Nuevo Empleado (preservación localStorage, validaciones) | Admin, RRHH |
| Detalle de Empleado (tabs: información personal, cargo/salario, estados, documentos) | Todos |
| Solicitud de Cambio de Información | Consultante |
| Cambiar Cargo / Salario (formulario con cargo actual y nuevo cargo) | Admin, RRHH |
| Gestión de Documentos (subida temporal + bandeja de aprobación RRHH) | Admin, RRHH |
| Contratos (nuevo, renovar, terminar, adendas con antes/después, descarga PDF) | Admin, RRHH |
| Solicitud y Gestión de Vacaciones (elegibilidad, formulario, aprobación) | Todos |
| Reportes + Exportación CSV / Vista turnover | Todos |
| Módulo Departamentos del Cargo | Admin |
| Log de Auditoría (tipo_accion, IP, user_agent, filtros por fecha/usuario) | Admin |
| Portal Super Admin (empresas, demos, suscripciones, admins, auditoría global) | Super Admin |
| Mi Perfil + Configuración (seguridad, notificaciones, apariencia, sesión activa) | Todos |

> **Nota UI:** todas las acciones del sistema generan tarjetas de alerta (toast) de confirmación, error o advertencia. Los campos con tilde y caracteres especiales se renderizan correctamente en todos los formularios.

---

## 16. Monetización

| Plan | Precio/mes | Empleados | Características |
|------|-----------|-----------|----------------|
| **Básico** | $49.000 COP | Hasta 20 | Auth, Empleados, Contratos |
| **Profesional** | $129.000 COP | Hasta 100 | + Vacaciones, Reportes, Historial |
| **Empresarial** | $299.000 COP | Ilimitados | + SLA, auditoría completa, Super Admin, soporte prioritario |

### Costos de infraestructura estimados (mensual)

| Servicio | Estimado |
|---------|---------|
| Backend microservicios (Render/Railway) | $20–50 USD |
| Frontend (Vercel) | $0–20 USD |
| PostgreSQL administrado | $10–30 USD |
| AWS S3 | $1–5 USD |
| SMTP (SendGrid / Gmail) | $0–15 USD |
| **Total** | **$31–120 USD/mes** |

---

## 17. Estudio de Mercado

| Aplicación | Precio | Diferencia con HR System |
|-----------|--------|--------------------------|
| BambooHR | $6–12 USD/empleado/mes | No adaptado a Colombia, caro por empleado |
| Factorial HR | €4–8/empleado/mes | Enfocado en Europa |
| Acsendo (CO) | Cotización | Solo evaluación de desempeño |
| Siigo Nómina (CO) | Desde $79K COP/mes | Solo nómina |
| Excel/Sheets | Gratis | Sin validaciones, roles ni trazabilidad |

**Ventaja competitiva:** precio fijo por empresa (no por empleado), 100% en español, festivos y legislación colombiana integrados (CST), historial de carrera real, gestión de sesiones segura con rotación de refresh tokens, flujo de aprobación documental, administración multiempresa centralizada y demo sin tarjeta de crédito.

---

## 18. Estrategia de Visibilidad

1. **LinkedIn:** publicaciones orientadas a gerentes de RRHH y dueños de PyMEs colombianas.
2. **Grupos de empresarios:** Facebook, WhatsApp Business.
3. **Referidos:** descuento del 20% por empresa referida.
4. **Trial gratuito:** demo de 2 días sin tarjeta de crédito, hasta 2 activaciones.
5. **SEO:** blog sobre legislación laboral colombiana (CST, festivos, tipos de contrato).
6. **Alianzas:** contadores, asesores laborales y firmas de RR.HH.

---

## 19. Roadmap

### v1.0 — MVP original ✅
- Auth con JWT + refresh tokens + logout real
- Empleados con historial de cargo/salario y documentos en S3
- Contratos con adendas y validación REST
- Vacaciones con días disponibles, festivos en BD y SMTP
- Reportes sin BD propia (patrón Aggregator)
- Historial y log de auditoría
- Migraciones + seeds automáticos en Docker
- Pruebas unitarias, E2E (Playwright), performance (k6)

### v2.0 — Ciclo actual ✅
- Separación formal de 4 roles con 4 dashboards independientes
- Recuperación de contraseña + cambio de contraseña autenticado
- Rotación de refresh tokens (cada renovación genera par nuevo)
- Tabla `password_reset_tokens` para flujo completo de reset
- Preferencias de notificación por usuario (`notif_login`, `notif_cambios`)
- Notificaciones de cambios de empleados vía endpoint interno al Auth Service
- Super Admin Service con gestión multiempresa completa
- Flujo demo (2 días, máx. 2 activaciones, 1 dispositivo) y suscripción con contrato PDF
- Máximo 2 cuentas RRHH por empresa (validado en backend)
- Autoconsulta del consultante (`/me`, `/me/latest`, `/me/eligibility`)
- Solicitud de cambio de información por parte del empleado
- Elegibilidad parametrizable para solicitud de vacaciones
- Vencimiento automático de contratos vía job diario
- Terminar contrato con propagación automática de estado al empleado
- Adendas con `cambios_json` (antes/después por campo) aplicados al contrato activo
- Validación de correo real al registrar
- Auditoría detallada: tipo_accion, IP, user_agent, empleado afectado
- Registros diferenciados de logout, logout-all, token_renovado, vencimiento_contrato
- Preservación de formulario de empleado en localStorage
- Flujo de aprobación RRHH para documentos (temporal → activo)
- Exportación CSV con BOM UTF-8, logo y formato organizado
- Departamentos y ciudades de Colombia vía JSON semilla
- Estado "transición" para contratos próximos a vencer
- Sanitización de campos de texto contra SQL injection y XSS en correos

### v2.1 — Q3 2025
- [ ] Exportación de reportes a Excel/PDF
- [ ] Notificaciones push para aprobaciones
- [ ] Firma digital de contratos

### v2.2 — Q4 2025
- [ ] Módulo de nómina básica
- [ ] Dashboard con gráficas de rotación y ausentismo avanzadas

### v3.0 — 2026
- [ ] App móvil (React Native)
- [ ] Integración con Siigo / Alegra
- [ ] IA para predicción de rotación de personal

---

## 20. Diagramas

> Versiones editables disponibles en `/docs/diagrams/` (draw.io / PlantUML).

### Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLIENTE (Navegador)                                                         │
│  Frontend — React + Vite + TailwindCSS  [Vercel]                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ Dashboard    │ │ Dashboard    │ │ Dashboard    │ │ Dashboard          │  │
│  │ Super Admin  │ │ Admin        │ │ RRHH         │ │ Consultante        │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ HTTPS + Bearer Token (JWT)
┌────────────────────────────────▼────────────────────────────────────────────┐
│  BACKEND — 7 Microservicios [Railway / Render]                               │
│                                                                              │
│  Auth :3001      Employee :3002    Contract :3003    Super Admin :3007       │
│  auth_db         employee_db       contract_db       superadmin_db           │
│                                                                              │
│  Vacation :3004    Report :3005 (sin BD)    History :3006                    │
│  vacation_db                                history_db                       │
│                                                                              │
│  ┌──────────────────────────┐   ┌───────────────────────────────────────┐    │
│  │  AWS S3                  │   │  SMTP (Nodemailer / Gmail)             │    │
│  │  /fotos/                 │   │  Credenciales · Vacaciones             │    │
│  │  /contratos/ /adendas/   │   │  Cambios empleados · Correcciones      │    │
│  │  /certificados/          │   │  Contratos PDF · Demos                 │    │
│  │  /temporal/ (aprobación) │   └───────────────────────────────────────┘    │
│  └──────────────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Diagrama de secuencia — Flujo principal

```
RRHH/Admin  Frontend   AuthSvc   EmployeeSvc  S3 Bucket  ContractSvc  VacationSvc  HistorySvc  SMTP
    │           │          │           │            │            │            │            │        │
    │──Login───►│          │           │            │            │            │            │        │
    │           │──POST /login─────────►            │            │            │            │        │
    │           │◄──access+refresh token│           │            │            │            │        │
    │           │          │──login (fire-and-forget)────────────────────────────────────►│        │
    │           │          │           │            │            │            │            │        │
    │──Reg. empleado──────►│           │            │            │            │            │        │
    │           │──POST /empleados──────────────────►            │            │            │        │
    │           │          │           │──INSERT empleado         │            │            │        │
    │           │          │           │──POST /historial (fire-and-forget)─────────────►│        │
    │           │◄──201 + empleado_id───│           │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Subir doc temporal─►│           │            │            │            │            │        │
    │           │──POST /presigned-url──────────────►            │            │            │        │
    │           │          │           │──genera URL → S3 /temporal/─────────►│            │        │
    │           │◄──URL temporal────────│           │            │            │            │        │
    │──PUT directo a S3────────────────────────────────────────►│            │            │        │
    │           │──POST /documentos (confirmar)──────►            │            │            │        │
    │           │          │           │──correo RRHH──────────────────────────────────────────────►│
    │           │◄──201 pendiente_aprobacion         │            │            │            │        │
    │──Aprobar doc─────────►            │            │            │            │            │        │
    │           │──PATCH /documentos/aprobar─────────►            │            │            │        │
    │           │          │           │──mueve /temporal/ → S3 definitivo──────────────►│        │
    │           │◄──200 estado: activo──│           │            │            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Crear contrato─────►│           │            │            │            │            │        │
    │           │──POST /contratos──────────────────────────────►│            │            │        │
    │           │          │           │◄──GET /empleados/:id────►            │            │        │
    │           │          │           │──200 existe────────────►│            │            │        │
    │           │          │           │            │──HeadObject S3──────────►│            │        │
    │           │◄──201 contrato────────────────────────────────│            │            │        │
    │           │          │           │            │            │            │            │        │
    │──Logout──►│          │           │            │            │            │            │        │
    │           │──POST /logout─────────►           │            │            │            │        │
    │           │          │──revoca token           │            │            │            │        │
    │           │          │──logout (fire-and-forget)───────────────────────────────────►│        │
    │           │◄──200─────│           │            │            │            │            │        │
```

### Diagrama entidad-relación resumido

```
[DB AUTH]                            [DB EMPLOYEE]
users                                departamentos
  └── refresh_tokens                   └── empleados
  └── password_reset_tokens                 └── cargos_salarios
                                            └── documentos_empleado
                                                 estado: pendiente | activo | rechazado
                                                 S3: /temporal/ → /definitivo/

[DB CONTRACT]                        [DB VACATION]
contratos                            vacaciones
  └── adendas_contratos               └── dias_disponibles (col. GENERATED)
       cambios_json JSONB              └── festivos (seed 18 festivos CO 2025)

[DB HISTORY]                         [DB SUPER ADMIN]
historial_cambios                    super_admins (máx. 2 globales)
acciones_sistema                     └── empresas
(ip_origen + user_agent siempre)         └── admins_empresa (máx. 2 por empresa)
                                         └── refresh_tokens_superadmin
```

---

## 21. Estructura de Repositorios

```
hr-system-backend/
├── auth-service/
│   ├── src/
│   │   ├── config/              # database.ts, env.ts
│   │   ├── controllers/         # auth.controller.ts, user.controller.ts
│   │   ├── services/            # auth.service.ts, email/smtp-email.service.ts
│   │   ├── repositories/        # user, refreshToken, password-reset-token (con interfaces)
│   │   ├── middlewares/         # auth, authorize, error-handler, validate-request
│   │   ├── routes/              # auth, user, protected, internal, health
│   │   ├── schemas/             # auth.schema.ts (Zod)
│   │   └── utils/               # jwt.util.ts, password.util.ts, token.util.ts
│   ├── migrations/
│   └── tests/
│
├── employee-service/
│   ├── src/
│   │   ├── config/              # database.ts, env.ts, s3.ts
│   │   ├── controllers/         # employee.controller.ts
│   │   ├── services/            # employee.service.ts
│   │   ├── repositories/        # employee, cargoSalario, documento (con interfaces DIP)
│   │   ├── clients/             # historyServiceClient, contractServiceClient,
│   │   │                        # authNotificationClient
│   │   ├── middlewares/         # auth, authorize, error-handler, not-found
│   │   └── routes/              # employee.routes.ts
│   ├── migrations/
│   ├── data/departamentos_colombia.json
│   └── tests/unit/              # 128 tests
│
├── contract-service/
│   ├── src/
│   │   ├── config/              # database.ts, env.ts, s3.ts
│   │   ├── controllers/         # contract.controller.ts
│   │   ├── services/            # contract.service.ts, jobs/autoExpire.job.ts
│   │   ├── repositories/        # contract, amendment (con interfaces DIP)
│   │   ├── clients/             # employeeServiceClient, historyServiceClient
│   │   └── routes/              # contract.routes.ts
│   └── migrations/
│
├── vacation-service/
│   ├── src/
│   │   ├── config/              # database.ts, env.ts
│   │   ├── controllers/         # vacation.controller.ts
│   │   ├── services/            # vacation.service.ts, businessRules.service.ts,
│   │   │                        # diasDisponibles.service.ts, email.service.ts
│   │   ├── repositories/        # vacation, diasDisponibles, festivos
│   │   └── clients/             # employeeServiceClient, historyServiceClient
│   └── migrations/
│
├── report-service/                      ← Stateless aggregator, sin BD
│   ├── src/
│   │   ├── clients/             # employeeClient, contractClient, vacationClient,
│   │   │                        # historyClient (fire-and-forget)
│   │   ├── services/            # report.service.ts (Promise.allSettled)
│   │   ├── controller/          # report.controller.ts
│   │   ├── middlewares/         # auth, error-handler, validation
│   │   └── utils/               # async-handler.util.ts
│   │                            # report-formatter.util.ts (CSV sin dependencias externas)
│   ├── tests/unit/              # 85 tests, cobertura 100%
│   ├── vitest.config.ts
│   └── sonar-project.properties
│
├── history-service/
│   ├── src/
│   │   ├── config/              # database.ts, env.ts
│   │   ├── controllers/         # history.controller.ts
│   │   ├── services/            # history.service.ts
│   │   ├── repositories/        # historialCambios, accionesSistema
│   │   └── routes/              # history.routes.ts
│   └── migrations/
│
├── super-admin-service/
│   ├── src/
│   │   ├── config/              # database.ts, env.ts
│   │   ├── controller/          # auth.controller.ts, empresa.controller.ts,
│   │   │                        # auditoria.controller.ts
│   │   ├── services/            # auth.service.ts, empresa.service.ts,
│   │   │                        # email.service.ts, auditoria.service.ts
│   │   ├── repositories/        # superAdmin, empresa, adminEmpresa, refreshToken
│   │   ├── clients/             # authClient, employeeClient, historyClient
│   │   ├── middlewares/         # auth (verifySuperAdminToken, verifyRegisterSecret),
│   │   │                        # error-handler, validation
│   │   ├── dtos/                # Zod schemas por operación
│   │   └── shared/              # errors/, enums/ (plan, estado-empresa)
│   ├── migrations/
│   ├── tests/unit/
│   └── vitest.config.ts
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/workflows/
│   ├── ci-backend.yml
│   └── deploy.yml
└── README.md                    ← Este archivo

hr-system-frontend/
├── src/
│   ├── components/
│   │   ├── employees/
│   │   │   ├── EmployeeForm.tsx          ← preserva datos en localStorage
│   │   │   ├── EmployeeFilters.tsx       ← filtros corregidos
│   │   │   ├── DocumentUploader.tsx      ← flujo temporal + aprobación RRHH
│   │   │   └── CorrectionRequest.tsx     ← solicitud de cambio de información
│   │   └── super-admin/
│   │       ├── EmpresasList.tsx
│   │       ├── EmpresaDetail.tsx
│   │       └── AuditGlobal.tsx
│   ├── pages/
│   │   ├── LoginSuperAdmin.tsx
│   │   ├── LoginAdmin.tsx
│   │   ├── DashboardSuperAdmin.tsx
│   │   ├── DashboardAdmin.tsx
│   │   ├── DashboardRRHH.tsx
│   │   └── DashboardConsultante.tsx
│   └── hooks/
│       └── useFormPersistence.ts         ← persistencia en localStorage

hr-system-tests/
├── e2e/
│   ├── auth.spec.ts              ✅ Implementado
│   ├── employees.spec.ts
│   ├── contracts.spec.ts
│   ├── vacations.spec.ts
│   ├── reports.spec.ts
│   └── super-admin.spec.ts
├── integration/
│   ├── auth.api.spec.ts          ✅ Implementado
│   ├── employees.api.spec.ts
│   ├── contracts.api.spec.ts
│   ├── vacations.api.spec.ts
│   ├── history.api.spec.ts
│   └── super-admin.api.spec.ts
├── performance/
│   ├── load/
│   │   ├── employees-load.js
│   │   └── vacations-load.js
│   └── stress/
│       ├── employees-stress.js
│       └── vacations-stress.js
└── playwright.config.ts
```

---

*HR System — Sistema Administrador de Empleados · Versión 4.0*  
*18 tablas · 7 microservicios · 4 roles · 4 dashboards · AWS S3 · JWT + Refresh Tokens con rotación · Festivos CO · Multiempresa · TypeScript*

---

## Cierre de produccion y despliegue

La guia final de despliegue esta centralizada en `../deploy/README.md`. Esa carpeta incluye:

- `docker-compose.prod.yml` para levantar backend, frontend, PostgreSQL y reverse proxy en una VM Linux.
- `env.production.example` como checklist de variables por ambiente.
- `nginx/hr-system.conf` para enrutar frontend y microservicios bajo un solo dominio.
- `checklists/production-readiness.md` y `checklists/smoke-test.md` para validacion final.
- `scripts/backup-postgres.sh` para backups de PostgreSQL en despliegues con base local Docker.

Para produccion real, no usar Mailpit ni credenciales `local`. Se debe configurar un SMTP real y buckets S3 reales con acceso privado y presigned URLs.
