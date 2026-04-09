import { UserRepository, userRepository} from "../repositories/user.repository";
import { hashPassword, comparePassword } from "../utils/password.util";
import { generateJwtToken } from "../utils/jwt.util";
import { CreateUserDto } from "../dtos/create-user.dto";
import { LoginDto } from "../dtos/login.dto";
import { User } from "../entities/user.entity";
import { UnauthorizedError } from "../shared/errors/unauthorized.error";
import { forbiddenError } from "../shared/errors/forbidden.error";
import { ConflictError } from "../shared/errors/conflict.error";


export class AuthService {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository) {
        this.userRepository = userRepository;
    }

    public async register(createUserDto: CreateUserDto ) {
        const normalizedEmail = createUserDto.email.toLowerCase().trim();
        const existingUser = this.userRepository.findByEmail(normalizedEmail);
         if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }
        const hashedPassword = await hashPassword(createUserDto.password);

        const newUser: User = {
            id: Date.now(), // Simple ID generation for demonstration
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            email: normalizedEmail,
            password: hashedPassword,
            role: createUserDto.role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),

        };
        const createdUser = this.userRepository.create(newUser);
        return {
            id: createdUser.id,
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
        const normalizedEmail = loginDto.email.toLowerCase().trim();
        const user = this.userRepository.findByEmail(normalizedEmail);
    
        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }
        if (!user.isActive) {
            throw new forbiddenError('User account is inactive');
        }
        const isPasswordValid = await comparePassword(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }
        const token =  generateJwtToken({
            sub: user.id.toString(),
            email: user.email,
            role: user.role,
        });
        
        return {
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }
        }
    }

}

export const authService = new AuthService(userRepository);
