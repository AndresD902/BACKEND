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

router.get('/export/csv', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.exportCsv);
router.post('/presigned-url', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.generarPresignedUrl);
router.get('/documentos/:docId/url', employeeController.generarUrlDescarga);
router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getById);
router.post('/', requireRol(RoleName.ADMIN, RoleName.HR), validateBody(createEmpleadoSchema), employeeController.create);
router.patch('/:id', requireRol(RoleName.ADMIN, RoleName.HR), validateBody(updateEmpleadoSchema), employeeController.update);
router.delete('/:id', requireRol(RoleName.ADMIN), employeeController.softDelete);
router.get('/:id/cargo-actual', employeeController.getCargoActual);
router.get('/:id/historial-cargo', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.getHistorialCargos);
router.get('/:id/contrato-activo', employeeController.getContratoLaboralActivo);
router.post('/:id/cargo', requireRol(RoleName.ADMIN, RoleName.HR), validateBody(createCargoSchema), employeeController.crearCargo);
router.get('/:id/documentos', employeeController.getDocumentos);
router.post('/:id/documentos', requireRol(RoleName.ADMIN, RoleName.HR), employeeController.confirmarDocumento);
router.post('/:id/documentos/:docId/aprobar', requireRol(RoleName.HR), employeeController.aprobarDocumento);
router.post('/:id/solicitar-correccion', employeeController.solicitarCorreccion);
router.get('/justificaciones', employeeController.getJustificaciones);

export default router;
