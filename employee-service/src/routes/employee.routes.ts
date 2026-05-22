import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { requireRol } from '../middlewares/authorize.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { createEmpleadoSchema, updateEmpleadoSchema, createCargoSchema } from '../schemas/employee.schema';
import { RoleName } from '../shared/enums/role.enum';

const router = Router();

// Public endpoint for justificaciones (no authentication required)
router.get('/justificaciones-public', employeeController.getJustificaciones);

router.use(verifyToken);

router.get('/departamentos', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getDepartamentos);
router.get('/justificaciones', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getJustificaciones);
router.get('/export/csv', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.exportCsv);
router.post('/presigned-url', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.generarPresignedUrl);
router.get('/documentos/:docId/url', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.generarUrlDescarga);
router.get('/me', requireRol(RoleName.CONSULTATION), employeeController.getMe);
router.get('/me/cargo-actual', requireRol(RoleName.CONSULTATION), employeeController.getCargoActualMe);
router.get('/me/contrato-activo', requireRol(RoleName.CONSULTATION), employeeController.getContratoLaboralActivoMe);
router.get('/me/documentos', requireRol(RoleName.CONSULTATION), employeeController.getDocumentosMe);
router.get('/me/documentos/:docId/url', requireRol(RoleName.CONSULTATION), employeeController.generarUrlDescargaDocumentoPropio);
router.post('/me/solicitar-correccion', requireRol(RoleName.CONSULTATION), employeeController.solicitarCorreccionMe);
router.get('/', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getAll);
router.get('/:id', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getById);
router.post('/', requireRol(RoleName.ADMIN, RoleName.HR), validateBody(createEmpleadoSchema), employeeController.create);
router.patch('/:id', requireRol(RoleName.ADMIN, RoleName.HR), validateBody(updateEmpleadoSchema), employeeController.update);
router.delete('/:id', requireRol(RoleName.ADMIN), employeeController.softDelete);
router.get('/:id/cargo-actual', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getCargoActual);
router.get('/:id/historial-cargo', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getHistorialCargos);
router.get('/:id/contrato-activo', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getContratoLaboralActivo);
router.post('/:id/cargo', requireRol(RoleName.ADMIN, RoleName.HR), validateBody(createCargoSchema), employeeController.crearCargo);
router.get('/:id/documentos', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getDocumentos);
router.post('/:id/documentos', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.confirmarDocumento);
router.post('/:id/documentos/:docId/aprobar', requireRol(RoleName.HR), employeeController.aprobarDocumento);
router.patch('/:id/documentos/:docId/rechazar', requireRol(RoleName.HR), employeeController.rechazarDocumento);
router.post('/:id/solicitar-correccion', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.solicitarCorreccion);

export default router;
