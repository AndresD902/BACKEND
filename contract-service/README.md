# Contract Service

Microservicio dueño de los contratos laborales, adendas, historial contractual por empleado y referencias privadas a documentos en S3.

## Responsabilidades

- Crear contratos laborales asociados logicamente a `employee-service.empleados.id`.
- Mantener el historial completo de contratos por empleado.
- Garantizar que solo exista un contrato `activo` por empleado.
- Renovar contratos cerrando el contrato activo anterior y creando uno nuevo.
- Registrar adendas sobre contratos activos.
- Generar URLs firmadas de subida y descarga para PDFs/DOC/DOCX en S3.
- Registrar auditoria de cambios en `history-service`.

## Configuracion

El servicio compila con TypeScript en modo `node16`, igual que los microservicios ya alineados.

```txt
tsconfig.json             -> typecheck, sin emitir archivos
tsconfig.build.json       -> build productivo hacia dist/
tsconfig.test.json        -> Jest/ts-jest
tsconfig.migrations.json  -> node-pg-migrate
```

Variables principales:

```env
PORT=3003
DATABASE_URL=postgresql://...
JWT_SECRET=...
CORS_ORIGINS=http://localhost:5173
INTERNAL_API_KEY=clave_interna_muy_segura_cambiar_en_produccion
EMPLOYEE_SERVICE_URL=http://localhost:3002
HISTORY_SERVICE_URL=http://localhost:3006
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=admin-employee-microservice
```

`AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` deben venir juntas. Si no se definen, el SDK de AWS usara la cadena de credenciales por defecto del entorno; esto permite ejecutar el servicio con roles IAM administrados en infraestructura.

## Flujo de Archivo en S3

El archivo real vive en S3 privado. `contract-service` solo guarda `archivo_s3_key`.

```txt
1. Frontend solicita URL firmada:
   POST /api/contratos/presigned-url

2. Frontend sube el archivo directamente a S3 con PUT.

3. Frontend crea o renueva contrato enviando archivo_s3_key.

4. contract-service valida con HeadObject que el archivo exista en S3.

5. contract-service guarda el contrato sin persistir URLs publicas.

6. Para descargar, contract-service genera una URL firmada temporal.
```

## Endpoints

Todas las rutas requieren `Authorization: Bearer <token>`.

### Salud

```http
GET /health
```

### Contratos

```http
GET /api/contratos
GET /api/contratos/:id
GET /api/contratos/empleado/:employeeId
GET /api/contratos/employee/:employeeId
GET /api/contratos/empleado/:employeeId/activo
GET /api/contratos/employee/:employeeId/active
```

### Crear Contrato

```http
POST /api/contratos
```

Body:

```json
{
  "empleado_id": 7,
  "tipo": "fijo",
  "salario": 5500000,
  "moneda": "COP",
  "fecha_inicio": "2026-01-01",
  "fecha_fin": "2026-12-31",
  "metodo_pago": "transferencia",
  "periodicidad_pago": "mensual",
  "lugar_trabajo": "Bogota",
  "modalidad": "hibrido",
  "jornada": "completa",
  "archivo_s3_key": "contratos/empleados/7/contratos/..."
}
```

Reglas:

- Valida que el empleado exista en `employee-service`.
- Si `archivo_s3_key` viene informado, valida que exista en S3 con `HeadObject`.
- Rechaza la creacion si el empleado ya tiene contrato `activo`.
- Guarda solo `archivo_s3_key`; no persiste URLs publicas.

### Renovar Contrato

```http
POST /api/contratos/renovaciones
POST /api/contratos/renewals
```

Body:

```json
{
  "empleado_id": 7,
  "tipo": "fijo",
  "salario": 5800000,
  "fecha_inicio": "2027-01-01",
  "fecha_fin": "2027-12-31",
  "archivo_s3_key": "contratos/empleados/7/contratos/...",
  "estado_anterior": "vencido",
  "fecha_fin_anterior": "2026-12-31"
}
```

La renovacion corre en una transaccion:

```txt
contrato anterior activo -> vencido/terminado
nuevo contrato -> activo
```

### S3 URLs

```http
POST /api/contratos/presigned-url
GET  /api/contratos/:id/documento/url
GET  /api/contratos/:id/document/url
```

Body para subida:

```json
{
  "empleado_id": 7,
  "contentType": "application/pdf",
  "nombre_archivo": "contrato-2027.pdf"
}
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "url": "https://s3...",
    "key": "contratos/empleados/7/contratos/...",
    "expiresIn": 300
  }
}
```

### Adendas

```http
POST /api/contratos/:id/adendas
POST /api/contratos/:id/amendments
GET  /api/contratos/:id/adendas
GET  /api/contratos/:id/amendments
POST /api/contratos/:id/adendas/presigned-url
GET  /api/contratos/:id/adendas/:amendmentId/documento/url
```

Las adendas solo pueden crearse si el contrato esta `activo`.

Si el body incluye `changes`/`cambios_json`, `contract-service` registra la adenda y aplica sobre el contrato activo los campos soportados:

```json
{
  "descripcion": "Ajuste salarial y modalidad",
  "fecha_vigencia": "2026-06-01",
  "cambios_json": {
    "salario": { "before": 5500000, "after": 5800000 },
    "modalidad": { "before": "hibrido", "after": "remoto" },
    "fecha_fin": { "before": "2026-12-31", "after": "2027-12-31" }
  }
}
```

Campos soportados por adenda: `salario`, `moneda`, `fecha_fin`, `metodo_pago`, `periodicidad_pago`, `lugar_trabajo`, `modalidad` y `jornada`. Campos no reconocidos quedan solo en el registro JSON de la adenda.

## Vencimiento Automatico

Al arrancar el servicio se ejecuta un job diario que marca como `vencido` todo contrato:

```txt
estado = activo
fecha_fin < fecha actual
```

Cada vencimiento automatico se registra en `history-service`.

## Seguridad S3

El bucket debe ser privado. En este proyecto se asume que la IAM y el CORS del bucket `admin-employee-microservice` ya estan configurados en infraestructura. Desde codigo, `contract-service` valida:

- Que exista `S3_BUCKET_NAME`.
- Que las credenciales, si se configuran por `.env`, esten completas.
- Que el archivo exista en S3 con `HeadObject` antes de crear contratos o adendas.
- Que las URLs firmadas expiren: subida en 300 segundos y descarga en 3600 segundos.
- Que no se persistan URLs publicas permanentes en BD.

Lo que no se puede confirmar solo desde codigo es que AWS tenga aplicada la politica IAM y la regla CORS correcta; eso debe validarse en el entorno real ejecutando el flujo completo: generar presigned URL, hacer `PUT` desde el frontend, crear contrato y descargar por URL temporal.

Permisos minimos esperados para el usuario/rol IAM usado por `contract-service`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::admin-employee-microservice/contratos/*"
    }
  ]
}
```

CORS recomendado para subida directa desde frontend:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

En produccion, reemplazar `AllowedOrigins` por el dominio real del frontend.

## Migraciones

Las migraciones de `contract-service` ya usan nombres con timestamp:

```txt
20260503120000000_create_contract.ts
20260503120100000_create_contract_amendments.ts
20260505152000000_align_contract_integrations.ts
```

No se renombraron migraciones antiguas de otros servicios porque `employee-service` e `history-service` ya tienen archivos tipo `001_*` y `002_*`. Si esas migraciones ya fueron aplicadas, renombrarlas puede desalinear la tabla `pgmigrations` y provocar que el sistema intente correr migraciones duplicadas o pierda trazabilidad. La limpieza debe hacerse aparte con backup, revision previa de `pgmigrations` y plan de remapeo por ambiente.

## Pruebas

```bash
npm run typecheck
npm run test
npm run build
```

Las pruebas cubren:

- Creacion de contrato con validacion de empleado y archivo en S3.
- Rechazo de contrato nuevo cuando ya existe contrato activo.
- Renovacion transaccional cerrando el contrato anterior.
- Vencimiento automatico y auditoria.
- Endpoints protegidos, presigned URLs, contrato activo y descargas.
