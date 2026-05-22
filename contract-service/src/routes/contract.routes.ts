import { Router } from 'express';
import { contractController } from '../controller/contract.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';

export const contractRouter = Router();

const readRoles = ['ADMIN', 'HR'];
const writeRoles = ['ADMIN', 'HR'];

contractRouter.use(authenticateToken);

contractRouter.post('/presigned-url', authorizeRoles(writeRoles), contractController.generateContractUploadUrl);
contractRouter.post('/renewals', authorizeRoles(writeRoles), contractController.renewContract);
contractRouter.post('/renovaciones', authorizeRoles(writeRoles), contractController.renewContract);
contractRouter.post('/', authorizeRoles(writeRoles), contractController.createContract);

contractRouter.get('/', authorizeRoles(readRoles), contractController.findAllContracts);
contractRouter.get('/me/latest', authorizeRoles(['CONSULTATION']), contractController.findLatestContractForCurrentUser);
contractRouter.get('/employee/:employeeId/active', authorizeRoles(readRoles), contractController.findActiveContractByEmployeeId);
contractRouter.get('/empleado/:employeeId/activo', authorizeRoles(readRoles), contractController.findActiveContractByEmployeeId);
contractRouter.get('/employee/:employeeId', authorizeRoles(readRoles), contractController.findContractsByEmployeeId);
contractRouter.get('/empleado/:employeeId', authorizeRoles(readRoles), contractController.findContractsByEmployeeId);

contractRouter.get('/:id/document/url', authorizeRoles(readRoles), contractController.generateContractDocumentUrl);
contractRouter.get('/:id/documento/url', authorizeRoles(readRoles), contractController.generateContractDocumentUrl);
contractRouter.patch('/:id/status', authorizeRoles(writeRoles), contractController.updateContractStatus);
contractRouter.patch('/:id/estado', authorizeRoles(writeRoles), contractController.updateContractStatus);

contractRouter.post('/:id/amendments/presigned-url', authorizeRoles(writeRoles), contractController.generateContractAmendmentUploadUrl);
contractRouter.post('/:id/adendas/presigned-url', authorizeRoles(writeRoles), contractController.generateContractAmendmentUploadUrl);
contractRouter.get('/:id/amendments/:amendmentId/document/url', authorizeRoles(readRoles), contractController.generateContractAmendmentDocumentUrl);
contractRouter.get('/:id/adendas/:amendmentId/documento/url', authorizeRoles(readRoles), contractController.generateContractAmendmentDocumentUrl);
contractRouter.post('/:id/amendments', authorizeRoles(writeRoles), contractController.createContractAmendment);
contractRouter.post('/:id/adendas', authorizeRoles(writeRoles), contractController.createContractAmendment);
contractRouter.get('/:id/amendments', authorizeRoles(readRoles), contractController.findContractAmendments);
contractRouter.get('/:id/adendas', authorizeRoles(readRoles), contractController.findContractAmendments);
contractRouter.get('/:id', authorizeRoles(readRoles), contractController.findContractById);
