import { UserRepository, userRepository } from '../repositories/user.repository';
import { NotFoundError } from '../shared/errors/not-found.error';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  public async findAll() {
    const users = await this.userRepository.findAll();
    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  public async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public async deactivate(id: string) {
    const user = await this.userRepository.updateStatus(id, false);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt,
    };
  }

  public async activate(id: string) {
    const user = await this.userRepository.updateStatus(id, true);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService(userRepository);
