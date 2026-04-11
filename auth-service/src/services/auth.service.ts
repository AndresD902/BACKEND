import { UserRepository, userRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateJwtToken } from '../utils/jwt.util';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoginDto } from '../dtos/login.dto';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { ForbiddenError } from '../shared/errors/forbidden.error';
import { ConflictError } from '../shared/errors/conflict.error';
import { RoleName } from '../entities/role.entity';



export class AuthService {
    constructor(private readonly userRepository: UserRepository) {}

    public async register(createUserDto: CreateUserDto ) {

        const normalizedEmail =  createUserDto.email.toLowerCase().trim();
        const existingUser = await  this.userRepository.findByEmail(normalizedEmail);

         if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }
        const hashedPassword = await hashPassword(createUserDto.password);

        const createdUser = await this.userRepository.create({
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            email: normalizedEmail,
            passwordHash: hashedPassword,
            role: createUserDto.role,
            isActive: true,
        });
        
        return {
            id: createdUser.id.toString(),
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            email: createdUser.email,
            role: createdUser.role,
            isActive: createdUser.isActive,
            createdAt: createdUser.createdAt,
            updatedAt: createdUser.updatedAt,
        }
    }

    public async login(loginDto: LoginDto) {
        const normalizedEmail =  loginDto.email.toLowerCase().trim();
        const user = await this.userRepository.findByEmail(normalizedEmail);
    
        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }
        if (!user.isActive) {
            throw new ForbiddenError('User account is inactive');
        }
        const isPasswordValid = await comparePassword(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }
        const token =  generateJwtToken({
            sub: user.id.toString(),
            email: user.email,
            role: user.role as RoleName,
        });
        
        return {
            token,
            user: {
                id: user.id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role as RoleName,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }
        }
    }

}

export const authService = new AuthService(userRepository);