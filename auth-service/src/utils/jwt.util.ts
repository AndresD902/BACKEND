import { env } from '../config/env';
import { RoleName } from '../entities/role.entity';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  sub: string; // The sub is used because JWT normally uses sub as a user identifier
  email: string;
  role: RoleName;
  companyId?: number;
  employeeId?: number; // Included for CONSULTATION role users to access their contracts
}

export const generateJwtToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
};

export const verifyJwtToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    throw new Error('Invalid token');
  }
};
