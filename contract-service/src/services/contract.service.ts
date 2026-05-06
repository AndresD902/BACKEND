import { ConflictError } from "../shared/errors/conflict.error";
import type { CreateContractAmendmentDto } from "../dtos/create-contract-amendment.dto";
import type { CreateContractDto } from "../dtos/create-contract.dto";
import type { CreateContractAmendmentFileUploadUrlDto, CreateContractFileUploadUrlDto } from "../dtos/contract-file.dto";
import type { UpdateContractStatusDto } from "../dtos/update-contract-status.dto";
import { ContractRepository } from "../repositories/contract.repository";
import type { Contract, ContractAmendmentPatch, ContractRenewalResult } from "../repositories/contract.repository";
import { ContractAmendmentRepository } from "../repositories/contract-amendment.repository";
import type { ContractAmendment } from "../repositories/contract-amendment.repository";
import { NotFoundError } from "../shared/errors/not-found.error";
import { employeeServiceClient } from "../clients/employeeServiceClient";
import type { EmployeeServiceClient } from "../clients/employeeServiceClient";
import { ContractStatus } from "../shared/enums/contract-status.enum";
import { PaymentFrequencyValues } from "../shared/enums/payment-frequency.enum";
import { PaymentMethodValues } from "../shared/enums/payment-method.enum";
import { WorkModeValues } from "../shared/enums/work-mode.enum";
import { WorkScheduleValues } from "../shared/enums/work-schedule.enum";
import { ValidationError } from "../shared/errors/validation.error";
import { contractStorageService } from "./contract-storage.service";
import type { ContractStorageService } from "./contract-storage.service";
import { contractAuditService } from "./contract-audit.service";
import type { ContractAuditService } from "./contract-audit.service";
import type { SignedUploadUrl } from "../config/s3";
import type { ContractActor } from "../types/contract-actor.type";

export interface ContractDocumentView {
    contract: Contract;
    document: {
        key: string;
        url: string;
        expiresIn: number;
    } | null;
}

export interface ContractRenewalOptions {
    previousStatus?: ContractStatus.EXPIRED | ContractStatus.TERMINATED;
    previousEndDate?: string | null;
}

export class ContractService {
    constructor(
        private contractRepository: ContractRepository,
        private contractAmendmentRepository: ContractAmendmentRepository,
        private employeeClient: EmployeeServiceClient,
        private storageService: ContractStorageService = contractStorageService,
        private auditService: ContractAuditService = contractAuditService,
    ) {}

    public async createContract(data: CreateContractDto, authorizationHeader: string, actor: ContractActor): Promise<Contract> {
        await this.employeeClient.verifyEmployeeExists(data.employeeId, authorizationHeader);
        await this.storageService.validateExistingFile(data.fileS3Key);

        const activeContract = await this.contractRepository.findActiveByEmployeeId(data.employeeId);

        if (activeContract) {
            throw new ConflictError('employee already has an active contract');
        }

        const contract = await this.contractRepository.create({
            ...data,
            fileS3Url: null,
            createdBy: data.createdBy ?? actor.email,
        });

        this.auditService.recordContractCreated(contract, actor);

        return contract;
    }

    public async renewContract(
        data: CreateContractDto,
        authorizationHeader: string,
        actor: ContractActor,
        options: ContractRenewalOptions
    ): Promise<ContractRenewalResult> {
        await this.employeeClient.verifyEmployeeExists(data.employeeId, authorizationHeader);
        await this.storageService.validateExistingFile(data.fileS3Key);

        const previousStatus = options.previousStatus ?? ContractStatus.EXPIRED;
        const previousEndDate = this.resolvePreviousContractEndDate(data.startDate, options.previousEndDate);

        const result = await this.contractRepository.renewActiveContract(
            {
                ...data,
                status: ContractStatus.ACTIVE,
                fileS3Url: null,
                createdBy: data.createdBy ?? actor.email,
            },
            previousStatus,
            previousEndDate,
        );

        if (!result) {
            throw new NotFoundError('Active contract not found for employee renewal');
        }

        this.auditService.recordContractRenewed(result.previousContract, result.contract, actor);

        return result;
    }

    public async findAllContracts(): Promise<Contract[]> {
        return this.contractRepository.findAll();
    }

    public async findContractById(id: number): Promise<Contract> {
        const contract = await this.contractRepository.findById(id);

        if (!contract) {
            throw new NotFoundError("Contract not found by Id");
        }
        return contract;
    }

    public async findContractsByEmployeeId(employeeId: number): Promise<Contract[]> {
        return this.contractRepository.findByEmployeeId(employeeId);
    }

    public async findActiveContractByEmployeeId(employeeId: number): Promise<ContractDocumentView> {
        const contract = await this.contractRepository.findActiveByEmployeeId(employeeId);

        if (!contract) {
            throw new NotFoundError("Active contract not found for employee");
        }

        return this.buildContractDocumentView(contract);
    }

    public async updateContractStatus(id: number, data: UpdateContractStatusDto, actor: ContractActor): Promise<Contract> {
        const currentContract = await this.contractRepository.findById(id);

        if (!currentContract) {
            throw new NotFoundError("Contract not found by status");
        }

        const contract = await this.contractRepository.updateStatus(id, data.status);

        if (!contract) {
            throw new NotFoundError("Contract not found by status");
        }

        this.auditService.recordStatusUpdated(currentContract, contract, actor);

        return contract;
    }

    public async createContractAmendment(contractId: number, data: CreateContractAmendmentDto, actor: ContractActor): Promise<ContractAmendment> {
        const contract = await this.contractRepository.findById(contractId);

        if (!contract) {
            throw new NotFoundError("Contract not found");
        }

        if (contract.status !== ContractStatus.ACTIVE) {
            throw new ConflictError('contract amendments can only be created for active contracts');
        }

        await this.storageService.validateExistingFile(data.fileS3Key);
        const contractPatch = this.buildContractPatchFromAmendment(data.changes);
        this.validateAmendmentPatchAgainstContract(contract, contractPatch);

        const amendmentNumber = await this.contractAmendmentRepository.findNextAmendmentNumber(contractId);

        const amendment = await this.contractAmendmentRepository.create(contractId, amendmentNumber, {
            ...data,
            fileS3Url: null,
            createdBy: data.createdBy ?? actor.email,
        });

        if (contractPatch) {
            const updatedContract = await this.contractRepository.applyAmendmentPatch(contractId, contractPatch);

            if (!updatedContract) {
                throw new NotFoundError("Contract not found");
            }
        }

        this.auditService.recordContractAmendmentCreated(contract, amendment, actor);

        return amendment;
    }

    public async findContractAmendments(contractId: number): Promise<ContractAmendment[]> {
        const contract = await this.contractRepository.findById(contractId);

        if (!contract) {
            throw new NotFoundError("Contract not found");
        }

        return this.contractAmendmentRepository.findByContractId(contractId);
    }

    public async expireEndedContracts(referenceDate = new Date().toISOString().slice(0, 10)): Promise<Contract[]> {
        const expiredContracts = await this.contractRepository.expireEndedContracts(referenceDate);

        for (const contract of expiredContracts) {
            this.auditService.recordContractAutoExpired(contract);
        }

        return expiredContracts;
    }

    public async generateContractUploadUrl(
        data: CreateContractFileUploadUrlDto,
        authorizationHeader: string
    ): Promise<SignedUploadUrl> {
        await this.employeeClient.verifyEmployeeExists(data.employeeId, authorizationHeader);

        return this.storageService.createUploadUrl({
            employeeId: data.employeeId,
            contentType: data.contentType,
            scope: 'contract',
        });
    }

    public async generateContractAmendmentUploadUrl(
        contractId: number,
        data: CreateContractAmendmentFileUploadUrlDto
    ): Promise<SignedUploadUrl> {
        const contract = await this.contractRepository.findById(contractId);

        if (!contract) {
            throw new NotFoundError("Contract not found");
        }

        if (contract.status !== ContractStatus.ACTIVE) {
            throw new ConflictError('contract amendment files can only be uploaded for active contracts');
        }

        return this.storageService.createUploadUrl({
            employeeId: contract.employeeId,
            contractId: contract.id,
            contentType: data.contentType,
            scope: 'amendment',
        });
    }

    public async generateContractDocumentUrl(contractId: number): Promise<{ key: string; url: string; expiresIn: number }> {
        const contract = await this.contractRepository.findById(contractId);

        if (!contract) {
            throw new NotFoundError("Contract not found");
        }

        if (!contract.fileS3Key) {
            throw new NotFoundError("Contract file not found");
        }

        const signedUrl = await this.storageService.createDownloadUrl(contract.fileS3Key);

        return {
            key: contract.fileS3Key,
            ...signedUrl,
        };
    }

    public async generateContractAmendmentDocumentUrl(
        contractId: number,
        amendmentId: number
    ): Promise<{ key: string; url: string; expiresIn: number }> {
        const contract = await this.contractRepository.findById(contractId);

        if (!contract) {
            throw new NotFoundError("Contract not found");
        }

        const amendment = await this.contractAmendmentRepository.findById(amendmentId);

        if (!amendment || amendment.contractId !== contractId) {
            throw new NotFoundError("Contract amendment not found");
        }

        if (!amendment.fileS3Key) {
            throw new NotFoundError("Contract amendment file not found");
        }

        const signedUrl = await this.storageService.createDownloadUrl(amendment.fileS3Key);

        return {
            key: amendment.fileS3Key,
            ...signedUrl,
        };
    }

    private async buildContractDocumentView(contract: Contract): Promise<ContractDocumentView> {
        if (!contract.fileS3Key) {
            return {
                contract,
                document: null,
            };
        }

        const signedUrl = await this.storageService.createDownloadUrl(contract.fileS3Key);

        return {
            contract,
            document: {
                key: contract.fileS3Key,
                url: signedUrl.url,
                expiresIn: signedUrl.expiresIn,
            },
        };
    }

    private resolvePreviousContractEndDate(startDate: string, previousEndDate?: string | null): string {
        if (previousEndDate) {
            return previousEndDate;
        }

        const parsedStartDate = new Date(`${startDate}T00:00:00.000Z`);

        if (Number.isNaN(parsedStartDate.getTime())) {
            throw new ValidationError('Start date must be valid to renew a contract');
        }

        parsedStartDate.setUTCDate(parsedStartDate.getUTCDate() - 1);

        return parsedStartDate.toISOString().slice(0, 10);
    }

    private buildContractPatchFromAmendment(changes: CreateContractAmendmentDto['changes']): ContractAmendmentPatch | null {
        if (!changes) {
            return null;
        }

        const patch: ContractAmendmentPatch = {};

        for (const [field, change] of Object.entries(changes)) {
            if (!change || !Object.prototype.hasOwnProperty.call(change, 'after')) {
                continue;
            }

            const after = change.after;

            switch (field) {
                case 'salary':
                case 'salario':
                    patch.salary = this.parsePositiveNumber(after, 'Salary');
                    break;
                case 'currency':
                case 'moneda':
                    patch.currency = this.parseTrimmedString(after, 'Currency');
                    break;
                case 'endDate':
                case 'fecha_fin':
                    patch.endDate = this.parseNullableDate(after, 'End date');
                    break;
                case 'paymentMethod':
                case 'metodo_pago':
                    patch.paymentMethod = this.parseNullableEnum(after, PaymentMethodValues, 'Payment method');
                    break;
                case 'paymentFrequency':
                case 'periodicidad_pago':
                    patch.paymentFrequency = this.parseNullableEnum(after, PaymentFrequencyValues, 'Payment frequency');
                    break;
                case 'workplace':
                case 'lugar_trabajo':
                    patch.workplace = this.parseNullableString(after, 'Workplace');
                    break;
                case 'workMode':
                case 'modalidad':
                    patch.workMode = this.parseEnum(after, WorkModeValues, 'Work mode');
                    break;
                case 'workSchedule':
                case 'jornada':
                    patch.workSchedule = this.parseEnum(after, WorkScheduleValues, 'Work schedule');
                    break;
                default:
                    break;
            }
        }

        return Object.keys(patch).length > 0 ? patch : null;
    }

    private validateAmendmentPatchAgainstContract(contract: Contract, patch: ContractAmendmentPatch | null): void {
        if (!patch) {
            return;
        }

        if (patch.endDate) {
            const startDate = new Date(contract.startDate);
            const endDate = new Date(`${patch.endDate}T00:00:00.000Z`);

            if (endDate < startDate) {
                throw new ValidationError('End date must be greater than or equal to start date');
            }
        }

        if (patch.currency && patch.currency.length > 10) {
            throw new ValidationError('Currency must be at most 10 characters long');
        }

        if (patch.workplace && patch.workplace.length > 150) {
            throw new ValidationError('Workplace must be at most 150 characters long');
        }
    }

    private parsePositiveNumber(value: unknown, fieldName: string): number {
        const parsedValue = Number(value);

        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
            throw new ValidationError(`${fieldName} must be greater than zero`);
        }

        return parsedValue;
    }

    private parseTrimmedString(value: unknown, fieldName: string): string {
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new ValidationError(`${fieldName} must be a non-empty string`);
        }

        return value.trim();
    }

    private parseNullableString(value: unknown, fieldName: string): string | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        return this.parseTrimmedString(value, fieldName);
    }

    private parseNullableDate(value: unknown, fieldName: string): string | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const dateValue = this.parseTrimmedString(value, fieldName);
        const parsedDate = new Date(`${dateValue}T00:00:00.000Z`);

        if (Number.isNaN(parsedDate.getTime())) {
            throw new ValidationError(`${fieldName} must be a valid date`);
        }

        return dateValue;
    }

    private parseEnum(value: unknown, allowedValues: readonly string[], fieldName: string): string {
        if (typeof value !== 'string' || !allowedValues.includes(value)) {
            throw new ValidationError(`${fieldName} is invalid`);
        }

        return value;
    }

    private parseNullableEnum(value: unknown, allowedValues: readonly string[], fieldName: string): string | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        return this.parseEnum(value, allowedValues, fieldName);
    }
}

export const contractService = new ContractService(
    new ContractRepository(),
    new ContractAmendmentRepository(),
    employeeServiceClient
);
