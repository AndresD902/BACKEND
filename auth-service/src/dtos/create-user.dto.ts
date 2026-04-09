import { RoleName, Role } from "../entities/role.entity";


export interface CreateUserDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: RoleName;
}