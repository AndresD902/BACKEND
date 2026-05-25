import { RoleName } from "../entities/role.entity";


export interface CreateUserDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: RoleName;
    companyId?: number;
    employeeId?: number;
    emailVerified?: boolean;
    mustChangePassword?: boolean;
}
