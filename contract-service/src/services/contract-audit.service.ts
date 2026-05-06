import type { Contract } from '../repositories/contract.repository';
import type { ContractAmendment } from '../repositories/contract-amendment.repository';
import { registrarCambio } from '../clients/historyServiceClient';
import { ContractStatus } from '../shared/enums/contract-status.enum';
import type { ContractActor } from '../types/contract-actor.type';

export class ContractAuditService {
  public recordContractCreated(contract: Contract, actor: ContractActor): void {
    registrarCambio({
      empleado_id: contract.employeeId,
      entidad: 'contrato',
      entidad_id: contract.id,
      campo_modificado: 'contrato_creado',
      valor_nuevo: JSON.stringify({
        tipo: contract.type,
        salario: contract.salary,
        fecha_inicio: contract.startDate,
        estado: contract.status,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });
  }

  public recordContractRenewed(previousContract: Contract, contract: Contract, actor: ContractActor): void {
    registrarCambio({
      empleado_id: previousContract.employeeId,
      entidad: 'contrato',
      entidad_id: previousContract.id,
      campo_modificado: 'estado',
      valor_anterior: ContractStatus.ACTIVE,
      valor_nuevo: previousContract.status,
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });

    registrarCambio({
      empleado_id: contract.employeeId,
      entidad: 'contrato',
      entidad_id: contract.id,
      campo_modificado: 'contrato_renovado',
      valor_nuevo: JSON.stringify({
        contrato_anterior_id: previousContract.id,
        tipo: contract.type,
        salario: contract.salary,
        fecha_inicio: contract.startDate,
        estado: contract.status,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });
  }

  public recordStatusUpdated(previousContract: Contract, contract: Contract, actor: ContractActor): void {
    registrarCambio({
      empleado_id: contract.employeeId,
      entidad: 'contrato',
      entidad_id: contract.id,
      campo_modificado: 'estado',
      valor_anterior: previousContract.status,
      valor_nuevo: contract.status,
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });
  }

  public recordContractAmendmentCreated(contract: Contract, amendment: ContractAmendment, actor: ContractActor): void {
    registrarCambio({
      empleado_id: contract.employeeId,
      entidad: 'contrato',
      entidad_id: contract.id,
      campo_modificado: `adenda_${amendment.amendmentNumber}`,
      valor_nuevo: JSON.stringify({
        descripcion: amendment.description,
        cambios: amendment.changes,
        fecha_vigencia: amendment.effectiveDate,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });
  }

  public recordContractAutoExpired(contract: Contract): void {
    registrarCambio({
      empleado_id: contract.employeeId,
      entidad: 'contrato',
      entidad_id: contract.id,
      campo_modificado: 'estado',
      valor_anterior: ContractStatus.ACTIVE,
      valor_nuevo: ContractStatus.EXPIRED,
      usuario_modificador: 'contract-service',
      rol_modificador: 'system',
    });
  }
}

export const contractAuditService = new ContractAuditService();
