import { Router } from 'express';
import { contractController } from '../controller/contract.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';

export const contractRouter = Router();

const readRoles = ['ADMIN', 'HR', 'CONSULTATION'];
const writeRoles = ['ADMIN', 'HR'];

contractRouter.use(authenticateToken);

contractRouter.post('/',authorizeRoles(writeRoles),contractController.createContract,);
contractRouter.get('/',authorizeRoles(readRoles),contractController.findAllContracts,);
contractRouter.get('/employee/:employeeId',authorizeRoles(readRoles),contractController.findContractsByEmployeeId,);

contractRouter.patch('/:id/status',authorizeRoles(writeRoles),contractController.updateContractStatus,);
contractRouter.post('/:id/amendments',authorizeRoles(writeRoles),contractController.createContractAmendment,);
contractRouter.get('/:id/amendments',authorizeRoles(readRoles),contractController.findContractAmendments,);
contractRouter.get('/:id',authorizeRoles(readRoles),contractController.findContractById,);
