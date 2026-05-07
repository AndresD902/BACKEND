import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  id:    number;
  email: string;
  rol:   'super_admin';
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
