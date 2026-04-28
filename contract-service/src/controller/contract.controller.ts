import { Request, Response } from "express";
import { createContractAmendmentSchema } from "../dtos/create-contract-amendment.dto";
import { createContractSchema } from "../dtos/create-contract.dto";
import { updateContractStatusSchema } from "../dtos/update-contract-status.dto";
import { contractService, ContractService } from "../services/contract.service";



export class ContractController {
    constructor(private readonly contractService: ContractService) {}

    public createContract = async (request: Request, response: Response): Promise<void> => {
        try {
            const parseBody = createContractSchema.safeParse(request.body);

            if (!parseBody.success) {
                response.status(400).json({
                    success: false,
                    message: 'Contract could not be created because the request data is invalid',
                    errors: parseBody.error.flatten().fieldErrors
                });
                return;
            }

            const contract = await this.contractService.createContract(parseBody.data);

            response.status(201).json({
                success: true,
                message: 'Contract created successfully',
                data: contract
            });
        } catch (error) {
            this.handleError(error, response);
        }
    };

    public findAllContracts = async (_request: Request, response: Response): Promise<void> => {
        try {
            const contracts = await this.contractService.findAllContracts();

            response.status(200).json({
                success: true,
                message: 'Contracts retrieved successfully',
                data: contracts
            });
        } catch (error) {
            this.handleError(error, response);
        }
    };

    public findContractById = async (request: Request, response: Response): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const contract = await this.contractService.findContractById(contractId);

            response.status(200).json({
                success: true,
                message: 'Contract retrieved successfully',
                data: contract
            });
        } catch (error) {
            this.handleError(error, response);
        }
    };

    public findContractsByEmployeeId = async (request: Request, response: Response): Promise<void> => {
        try {
            const employeeId = this.parsePositiveInteger(request.params.employeeId, 'Employee id');
            const contracts = await this.contractService.findContractsByEmployeeId(employeeId);

            response.status(200).json({
                success: true,
                message: 'Employee contracts retrieved successfully',
                data: contracts
            });
        } catch (error) {
            this.handleError(error, response);
        }
    };

    public updateContractStatus = async (request: Request, response: Response): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const parseBody = updateContractStatusSchema.safeParse(request.body);

            if (!parseBody.success) {
                response.status(400).json({
                    success: false,
                    message: 'Contract status could not be updated because the request data is invalid',
                    errors: parseBody.error.flatten().fieldErrors
                });
                return;
            }

            const contract = await this.contractService.updateContractStatus(contractId, parseBody.data);

            response.status(200).json({
                success: true,
                message: 'Contract status updated successfully',
                data: contract
            });
        } catch (error) {
            this.handleError(error, response);
        }
    };

    public createContractAmendment = async (request: Request, response: Response): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const parseBody = createContractAmendmentSchema.safeParse(request.body);

            if (!parseBody.success) {
                response.status(400).json({
                    success: false,
                    message: 'Contract amendment could not be created because the request data is invalid',
                    errors: parseBody.error.flatten().fieldErrors
                });
                return;
            }

            const contractAmendment = await this.contractService.createContractAmendment(contractId, parseBody.data);

            response.status(201).json({
                success: true,
                message: 'Contract amendment created successfully',
                data: contractAmendment
            });
        } catch (error) {
            this.handleError(error, response);
        }
    };

    public findContractAmendments = async (request: Request, response: Response): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const contractAmendments = await this.contractService.findContractAmendments(contractId);

            response.status(200).json({
                success: true,
                message: 'Contract amendments retrieved successfully',
                data: contractAmendments
            });
        } catch (error) {
            this.handleError(error, response);
        }
    };

    private parsePositiveInteger(value: string | string[] | undefined, fieldName: string): number {
        if (!value || Array.isArray(value)) {
            throw new Error(`${fieldName} must be a positive integer`);
        }

        const parsedValue = Number(value);

        if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
            throw new Error(`${fieldName} must be a positive integer`);
        }

        return parsedValue;
    }


    private handleError(error: unknown, response: Response): void {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';

        if (message.includes('not found')) {
            response.status(404).json({
                success: false,
                message
            });
            return;
        }

        if (message.includes('already has an active contract')){
            response.status(409).json({ success: false, message });
            return;
        }

        if (message.includes('must be a positive integer')) {
            response.status(400).json({
                success: false,
                message
            });
            return;
        }

        response.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

export const contractController = new ContractController(contractService);