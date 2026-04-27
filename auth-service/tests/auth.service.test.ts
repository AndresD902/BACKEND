import { RoleName } from "../src/entities/role.entity";
import { AuthService } from "../src/services/auth.service";
import { ConflictError } from "../src/shared/errors/conflict.error";
import { ForbiddenError } from "../src/shared/errors/forbidden.error";
import { UnauthorizedError } from "../src/shared/errors/unauthorized.error";
import { hashPassword, comparePassword } from "../src/utils/password.util";
import { generateJwtToken } from "../src/utils/jwt.util";

jest.mock("../src/utils/password.util", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock("../src/utils/jwt.util", () => ({
  generateJwtToken: jest.fn(),
}));

describe("AuthService", () => {
  let mockUserRepository: {
    findByEmail: jest.Mock;
    create: jest.Mock;
  };

  let authService: AuthService;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    jest.clearAllMocks();
    authService = new AuthService(mockUserRepository as any);
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const createUserDto = {
        firstName: "Andres",
        lastName: "Posada",
        email: "andresposada@gmail.com",
        password: "password123",
        role: RoleName.ADMIN,
      };

      mockUserRepository.findByEmail.mockReturnValue(undefined);
      (hashPassword as jest.Mock).mockResolvedValue("hashed-password");
      mockUserRepository.create.mockImplementation((user) => ({
        ...user,
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await authService.register(createUserDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "andresposada@gmail.com",
      );
      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(mockUserRepository.create).toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          id: "1",
          firstName: "Andres",
          lastName: "Posada",
          email: "andresposada@gmail.com",
          role: RoleName.ADMIN,
          isActive: true,
        }),
      );

      expect((result as any).password).toBeUndefined();
    });

    it("should throw ConflictError if email is already in use", async () => {
      const createUserDto = {
        firstName: "Andres",
        lastName: "Posada",
        email: "andresposada@gmail.com",
        password: "password123",
        role: RoleName.ADMIN,
      };

      mockUserRepository.findByEmail.mockReturnValue({
        id: 1,
        email: "andresposada@gmail.com",
      });

      await expect(authService.register(createUserDto)).rejects.toThrow(
        ConflictError,
      );

      expect(hashPassword).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("should normalize email before saving", async () => {
      const createUserDto = {
        firstName: "Andres",
        lastName: "Posada",
        email: "  ANDRESPOSADA@GMAIL.COM  ",
        password: "password123",
        role: RoleName.ADMIN,
      };

      mockUserRepository.findByEmail.mockReturnValue(undefined);
      (hashPassword as jest.Mock).mockResolvedValue("hashed-password");
      mockUserRepository.create.mockImplementation((user) => ({
        ...user,
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await authService.register(createUserDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "andresposada@gmail.com",
      );
      expect(result.email).toBe("andresposada@gmail.com");
    });
  });

  describe("login", () => {
    it("should login successfully and return token with user", async () => {
      const loginDto = {
        email: "andresposada@gmail.com",
        password: "password123",
      };

      const existingUser = {
        id: "1",
        firstName: "Andres",
        lastName: "Posada",
        email: "andresposada@gmail.com",
        passwordHash: "hashed-password",
        role: RoleName.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByEmail.mockReturnValue(existingUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateJwtToken as jest.Mock).mockReturnValue("mock-token");

      const result = await authService.login(loginDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "andresposada@gmail.com",
      );
      expect(comparePassword).toHaveBeenCalledWith(
        "password123",
        "hashed-password",
      );
      expect(generateJwtToken).toHaveBeenCalledWith({
        sub: "1",
        email: "andresposada@gmail.com",
        role: RoleName.ADMIN,
      });

      expect(result).toEqual({
        token: "mock-token",
        user: expect.objectContaining({
          id: "1",
          email: "andresposada@gmail.com",
          role: RoleName.ADMIN,
          isActive: true,
        }),
      });
    });

    it("should throw UnauthorizedError if user does not exist", async () => {
      const loginDto = {
        email: "andresposada@gmail.com",
        password: "password123",
      };

      mockUserRepository.findByEmail.mockReturnValue(undefined);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedError,
      );

      expect(comparePassword).not.toHaveBeenCalled();
      expect(generateJwtToken).not.toHaveBeenCalled();
    });

    it("should throw forbiddenError if user account is inactive", async () => {
      const loginDto = {
        email: "andresposada@gmail.com",
        password: "password123",
      };

      mockUserRepository.findByEmail.mockReturnValue({
        id: "1",
        firstName: "Inactive",
        lastName: "User",
        email: "andresposada@gmail.com",
        passwordHash: "hashed-password",
        role: RoleName.ADMIN,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(authService.login(loginDto)).rejects.toThrow(ForbiddenError);
      expect(comparePassword).not.toHaveBeenCalled();
      expect(generateJwtToken).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedError if password is incorrect", async () => {
      const loginDto = {
        email: "andresposada@gmail.com",
        password: "wrongpassword",
      };

      mockUserRepository.findByEmail.mockReturnValue({
        id: "1",
        firstName: "Andres",
        lastName: "Posada",
        email: "andresposada@gmail.com",
        passwordHash: "hashed-password",
        role: RoleName.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedError,
      );
      expect(generateJwtToken).not.toHaveBeenCalled();
    });
  });
});
