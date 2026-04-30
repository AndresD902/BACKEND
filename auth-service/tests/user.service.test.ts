import { UserService } from '../src/services/user.service';
import { NotFoundError } from '../src/shared/errors/not-found.error';
import { RoleName } from '../src/entities/role.entity';

const baseUser = {
  id: '1',
  firstName: 'Andres',
  lastName: 'Posada',
  email: 'andres@test.com',
  passwordHash: 'hashed-password',
  role: RoleName.ADMIN,
  isActive: true,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UserService', () => {
  let mockUserRepository: {
    findAll: jest.Mock;
    findById: jest.Mock;
    updateStatus: jest.Mock;
  };
  let userService: UserService;

  beforeEach(() => {
    mockUserRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    userService = new UserService(mockUserRepository as any);
  });

  describe('findAll', () => {
    it('should return mapped users without passwordHash', async () => {
      mockUserRepository.findAll.mockResolvedValue([baseUser]);

      const result = await userService.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: '1',
          firstName: 'Andres',
          email: 'andres@test.com',
          role: RoleName.ADMIN,
          isActive: true,
        }),
      );
      expect((result[0] as any).passwordHash).toBeUndefined();
    });

    it('should return an empty array when no users exist', async () => {
      mockUserRepository.findAll.mockResolvedValue([]);

      const result = await userService.findAll();

      expect(result).toEqual([]);
      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return the mapped user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);

      const result = await userService.findById('1');

      expect(result).toEqual(
        expect.objectContaining({ id: '1', email: 'andres@test.com' }),
      );
      expect((result as any).passwordHash).toBeUndefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.findById('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user and return mapped data', async () => {
      const deactivated = { ...baseUser, isActive: false };
      mockUserRepository.updateStatus.mockResolvedValue(deactivated);

      const result = await userService.deactivate('1');

      expect(result.isActive).toBe(false);
      expect(mockUserRepository.updateStatus).toHaveBeenCalledWith('1', false);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.updateStatus.mockResolvedValue(null);

      await expect(userService.deactivate('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('activate', () => {
    it('should activate a user and return mapped data', async () => {
      mockUserRepository.updateStatus.mockResolvedValue(baseUser);

      const result = await userService.activate('1');

      expect(result.isActive).toBe(true);
      expect(mockUserRepository.updateStatus).toHaveBeenCalledWith('1', true);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.updateStatus.mockResolvedValue(null);

      await expect(userService.activate('999')).rejects.toThrow(NotFoundError);
    });
  });
});
