/** * It reads and validates environment variables. If any are missing, it throws an error; if they exist, it returns them. Then all the variables are exported together in an `env` object.
 */

import dotenv from 'dotenv';

dotenv.config();

function getEnVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: getEnVariable('NODE_ENV'),
  port: Number(getEnVariable('PORT')),
  serviceName: getEnVariable('SERVICE_NAME'),
  jwtSecret: getEnVariable('JWT_SECRET'),
  jwtExpiresIn: getEnVariable('JWT_EXPIRES_IN'),
  bcryptSaltRounds: Number(getEnVariable('BCRYPT_SALT_ROUNDS')),
  databaseUrl: getEnVariable('DATABASE_URL'),
};
