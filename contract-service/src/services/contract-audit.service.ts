import type { Contract } from '../repositories/contract.repository';
import type { ContractAmendment } from '../repositories/contract-amendment.repository';
import { registrarAccion, registrarCambio } from '../clients/historyServiceClient';
import { ContractStatus } from '../shared/enums/contract-status.enum';
import type { ContractActor } from '../types/contract-actor.type';
import { calculatePaymentDistribution } from './payment-distribution.service';

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
        distribucion_pago: calculatePaymentDistribution(contract.salary, contract.paymentFrequency),
        fecha_inicio: contract.startDate,
        estado: contract.status,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });

    registrarAccion({
      usuario_email: actor.email,
      rol: actor.role,
      accion: 'contrato_creado',
      entidad: 'contrato',
      entidad_id: contract.id,
      resultado: 'exitoso',
      detalle: `Contrato creado para empleado ${contract.employeeId}`,
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
        distribucion_pago: calculatePaymentDistribution(contract.salary, contract.paymentFrequency),
        fecha_inicio: contract.startDate,
        estado: contract.status,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });

    registrarAccion({
      usuario_email: actor.email,
      rol: actor.role,
      accion: 'contrato_renovado',
      entidad: 'contrato',
      entidad_id: contract.id,
      resultado: 'exitoso',
      detalle: `Contrato ${previousContract.id} renovado por contrato ${contract.id}`,
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

    registrarAccion({
      usuario_email: actor.email,
      rol: actor.role,
      accion: 'contrato_estado_actualizado',
      entidad: 'contrato',
      entidad_id: contract.id,
      resultado: 'exitoso',
      detalle: `Estado de contrato actualizado de ${previousContract.status} a ${contract.status}`,
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
        distribucion_pago: calculatePaymentDistribution(contract.salary, contract.paymentFrequency),
        fecha_vigencia: amendment.effectiveDate,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.role,
    });

    registrarAccion({
      usuario_email: actor.email,
      rol: actor.role,
      accion: 'adenda_creada',
      entidad: 'contrato',
      entidad_id: contract.id,
      resultado: 'exitoso',
      detalle: `Adenda ${amendment.amendmentNumber} creada para contrato ${contract.id}`,
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

    registrarAccion({
      usuario_email: 'contract-service',
      rol: 'system',
      accion: 'contrato_vencido_automaticamente',
      entidad: 'contrato',
      entidad_id: contract.id,
      resultado: 'exitoso',
      detalle: `Contrato ${contract.id} vencido automaticamente`,
    });
  }
}

export const contractAuditService = new ContractAuditService();
