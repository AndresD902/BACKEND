import { CreateContractAmendmentDto } from "../dtos/create-contract-amendment.dto";
import { CreateContractDto } from "../dtos/create-contract.dto";
import { UpdateContractStatusDto } from "../dtos/update-contract-status.dto";
import { ContractRepository, Contract } from "../repositories/contract.repository";
import { ContractAmendment, ContractAmendmentRepository } from "repositories/contract-amendment.repository";


export class ContractService {
    constructor(
        private contractRepository: ContractRepository,
        private contractAmendmentRepository: ContractAmendmentRepository
    ) {}

    public async createContract(data: CreateContractDto): Promise<Contract> {
        const activeContract = await this.contractRepository.findActiveByEmployeeId(data.employeeId);

        if (activeContract) {
            throw new Error("employee already has an active contract");
        }

        return await this.contractRepository.create(data);
    }

    public async findAllContracts(): Promise<Contract[]> {
        return this.contractRepository.findAll();
    }

    public async findContractById(id: number): Promise<Contract> {
        const contract = await this.contractRepository.findById(id);

        if (!contract) {
            throw new Error("Contract not found by Id");
        }
        return contract;
    }

    public async findContractsByEmployeeId(employeeId: number): Promise<Contract[]> {
        return this.contractRepository.findByEmployeeId(employeeId);
    }

    public async updateContractStatus(id: number, data: UpdateContractStatusDto): Promise<Contract> {
        const contract = await this.contractRepository.updateStatus(id, data.status);

        if (!contract) {
            throw new Error("Contract not found by status");
        }
        return contract;
    }

    public async createContractAmendment(contractId: number, data: CreateContractAmendmentDto): Promise<ContractAmendment> {
        const contract = await this.contractRepository.findById(contractId);

        if (!contract) {
            throw new Error("Contract not found");
        }

        const amendmentNumber = await this.contractAmendmentRepository.findNextAmendmentNumber(contractId);

        return this.contractAmendmentRepository.create(contractId, amendmentNumber, data);
    }

    public async findContractAmendments(contractId: number): Promise<ContractAmendment[]> {
        const contract = await this.contractRepository.findById(contractId);

        if (!contract) {
            throw new Error("Contract not found");
        }

        return this.contractAmendmentRepository.findByContractId(contractId);
    }
}

export const contractService = new ContractService(
    new ContractRepository(),
    new ContractAmendmentRepository()
);