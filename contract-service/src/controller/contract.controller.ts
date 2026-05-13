import type { NextFunction, Request, Response } from "express";
import { createContractAmendmentFileUploadUrlSchema, createContractFileUploadUrlSchema } from "../dtos/contract-file.dto";
import { createContractAmendmentSchema } from "../dtos/create-contract-amendment.dto";
import { createContractSchema } from "../dtos/create-contract.dto";
import { updateContractStatusSchema } from "../dtos/update-contract-status.dto";
import { contractService } from "../services/contract.service";
import type { ContractService } from "../services/contract.service";
import type { AuthenticatedRequestWithJwt } from "../middlewares/auth.middleware";
import { AppError } from "../shared/errors/app-error";
import { ValidationError } from "../shared/errors/validation.error";
import { ContractStatus } from "../shared/enums/contract-status.enum";

export class ContractController {
    constructor(private readonly contractService: ContractService) {}

    public createContract = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const parseBody = createContractSchema.safeParse(request.body);

            if(!parseBody.success) {
                next(
                    new ValidationError(
                        'Contract could not be created because the request data is invalid',
                        parseBody.error.flatten().fieldErrors
                    ),
                );
                return;
            }

            const authorizationHeader = this.getAuthorizationHeader(request);
            const actor = this.getAuthenticatedUser(request);
            const contract = await this.contractService.createContract(parseBody.data, authorizationHeader, actor);

            response.status(201).json({
                success: true,
                message: 'Contract created successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    };

    public renewContract = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const parseBody = createContractSchema.safeParse(request.body);

            if(!parseBody.success) {
                next(
                    new ValidationError(
                        'Contract could not be renewed because the request data is invalid',
                        parseBody.error.flatten().fieldErrors
                    ),
                );
                return;
            }

            const authorizationHeader = this.getAuthorizationHeader(request);
            const actor = this.getAuthenticatedUser(request);
            const renewalOptions = this.getRenewalOptions(request.body);
            const result = await this.contractService.renewContract(parseBody.data, authorizationHeader, actor, renewalOptions);

            response.status(201).json({
                success: true,
                message: 'Contract renewed successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    public findAllContracts = async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contracts = await this.contractService.findAllContracts();

            response.status(200).json({
                success: true,
                message: 'Contracts retrieved successfully',
                data: contracts
            });
        } catch (error) {
            next(error);
        }
    };

    public findContractById = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const contract = await this.contractService.findContractById(contractId);

            response.status(200).json({
                success: true,
                message: 'Contract retrieved successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    };

    public findContractsByEmployeeId = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const employeeId = this.parsePositiveInteger(request.params.employeeId, 'Employee id');
            const contracts = await this.contractService.findContractsByEmployeeId(employeeId);

            response.status(200).json({
                success: true,
                message: 'Employee contracts retrieved successfully',
                data: contracts
            });
        } catch (error) {
            next(error);
        }
    };

    public findActiveContractByEmployeeId = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const employeeId = this.parsePositiveInteger(request.params.employeeId, 'Employee id');
            const contract = await this.contractService.findActiveContractByEmployeeId(employeeId);

            response.status(200).json({
                success: true,
                message: 'Active employee contract retrieved successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    };

    public updateContractStatus = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const parseBody = updateContractStatusSchema.safeParse(request.body);

            if(!parseBody.success) {
                next(
                    new ValidationError(
                        'Contract status could not be updated because the request data is invalid',
                        parseBody.error.flatten().fieldErrors
                    ),
                );
                return;
            }

            const actor = this.getAuthenticatedUser(request);
            const contract = await this.contractService.updateContractStatus(contractId, parseBody.data, actor);

            response.status(200).json({
                success: true,
                message: 'Contract status updated successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    };

    public createContractAmendment = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const parseBody = createContractAmendmentSchema.safeParse(request.body);

            if(!parseBody.success) {
                next(
                    new ValidationError(
                        'Contract amendment could not be created because the request data is invalid',
                        parseBody.error.flatten().fieldErrors
                    ),
                );
                return;
            }

            const actor = this.getAuthenticatedUser(request);
            const contractAmendment = await this.contractService.createContractAmendment(contractId, parseBody.data, actor);

            response.status(201).json({
                success: true,
                message: 'Contract amendment created successfully',
                data: contractAmendment
            });
        } catch (error) {
            next(error);
        }
    };

    public findContractAmendments = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const contractAmendments = await this.contractService.findContractAmendments(contractId);

            response.status(200).json({
                success: true,
                message: 'Contract amendments retrieved successfully',
                data: contractAmendments
            });
        } catch (error) {
            next(error);
        }
    };

    public generateContractUploadUrl = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const parseBody = createContractFileUploadUrlSchema.safeParse(request.body);

            if(!parseBody.success) {
                next(
                    new ValidationError(
                        'Contract upload URL could not be generated because the request data is invalid',
                        parseBody.error.flatten().fieldErrors
                    ),
                );
                return;
            }

            const authorizationHeader = this.getAuthorizationHeader(request);
            const upload = await this.contractService.generateContractUploadUrl(parseBody.data, authorizationHeader);

            response.status(200).json({
                success: true,
                message: 'Contract upload URL generated successfully',
                data: upload
            });
        } catch (error) {
            next(error);
        }
    };

    public generateContractDocumentUrl = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const document = await this.contractService.generateContractDocumentUrl(contractId);

            response.status(200).json({
                success: true,
                message: 'Contract document URL generated successfully',
                data: document
            });
        } catch (error) {
            next(error);
        }
    };

    public generateContractAmendmentUploadUrl = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const parseBody = createContractAmendmentFileUploadUrlSchema.safeParse(request.body);

            if(!parseBody.success) {
                next(
                    new ValidationError(
                        'Contract amendment upload URL could not be generated because the request data is invalid',
                        parseBody.error.flatten().fieldErrors
                    ),
                );
                return;
            }

            const upload = await this.contractService.generateContractAmendmentUploadUrl(contractId, parseBody.data);

            response.status(200).json({
                success: true,
                message: 'Contract amendment upload URL generated successfully',
                data: upload
            });
        } catch (error) {
            next(error);
        }
    };

    public generateContractAmendmentDocumentUrl = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const contractId = this.parsePositiveInteger(request.params.id, 'Contract id');
            const amendmentId = this.parsePositiveInteger(request.params.amendmentId, 'Contract amendment id');
            const document = await this.contractService.generateContractAmendmentDocumentUrl(contractId, amendmentId);

            response.status(200).json({
                success: true,
                message: 'Contract amendment document URL generated successfully',
                data: document
            });
        } catch (error) {
            next(error);
        }
    };

    public findLatestContractForCurrentUser = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
        try {
            const user = (request as AuthenticatedRequestWithJwt).user;

            if (!user || !user.employeeId) {
                next(new AppError('Employee ID is required. CONSULTATION users must have an employee record.', 403));
                return;
            }

            const contract = await this.contractService.findLatestContractForAuthenticatedUser(user.employeeId);

            response.status(200).json({
                success: true,
                message: 'User contract retrieved successfully',
                data: contract
            });
        } catch (error) {
            next(error);
        }
    };

    private getAuthorizationHeader(request: Request): string {
        const authorizationHeader = request.headers.authorization;

        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new AppError('Authenticated token is required', 401);
        }

        return authorizationHeader;
    }

    private getAuthenticatedUser(request: Request): { email: string; role: string } {
        const user = (request as AuthenticatedRequestWithJwt).user;

        if (!user) {
            throw new AppError('Authenticated user data is required', 401);
        }

        return {
            email: user.email,
            role: user.role,
        };
    }

    private getRenewalOptions(body: unknown): { previousStatus?: ContractStatus.EXPIRED | ContractStatus.TERMINATED; previousEndDate?: string | null } {
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return {};
        }

        const input = body as Record<string, unknown>;
        const rawPreviousStatus = input.previousStatus ?? input.previous_status ?? input.estado_anterior;
        const rawPreviousEndDate = input.previousEndDate ?? input.previous_end_date ?? input.fecha_fin_anterior;

        if (
            rawPreviousStatus !== undefined
            && rawPreviousStatus !== ContractStatus.EXPIRED
            && rawPreviousStatus !== ContractStatus.TERMINATED
        ) {
            throw new ValidationError('Previous contract status must be vencido or terminado');
        }

        return {
            previousStatus: rawPreviousStatus as ContractStatus.EXPIRED | ContractStatus.TERMINATED | undefined,
            previousEndDate: rawPreviousEndDate ? String(rawPreviousEndDate) : null,
        };
    }

    private parsePositiveInteger(value: string | string[] | undefined, fieldName: string): number {
        if (!value || Array.isArray(value)) {
            throw new ValidationError(`${fieldName} must be a positive integer`);
        }

        const parsedValue = Number(value);

        if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
            throw new ValidationError(`${fieldName} must be a positive integer`);
        }

        return parsedValue;
    }
}

export const contractController = new ContractController(contractService);
