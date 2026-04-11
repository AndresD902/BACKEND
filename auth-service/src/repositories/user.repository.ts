import { Prisma, User } from "generated/prisma/client";
import { prisma } from "../config/prisma";


export class UserRepository {
  public async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  public async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  public async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  public async findAll(): Promise<User[]> {
    return prisma.user.findMany({
        orderBy: {
            createdAt: 'desc',
        },
    });
  }
}

export const userRepository = new UserRepository();

