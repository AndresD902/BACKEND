import { Router } from 'express';
import { contractController } from '../controller/contract.controller';

export const contractRouter = Router();

contractRouter.post('/', contractController.createContract);
contractRouter.get('/', contractController.findAllContracts);
contractRouter.get('/employee/:employeeId', contractController.findContractsByEmployeeId);
contractRouter.patch('/:id/status', contractController.updateContractStatus);
contractRouter.post('/:id/amendments', contractController.createContractAmendment);
contractRouter.get('/:id/amendments', contractController.findContractAmendments);
contractRouter.get('/:id', contractController.findContractById);
