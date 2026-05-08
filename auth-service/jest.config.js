/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/config/env.ts',
    '!src/services/email/smtp-email.service.ts',
    '!src/clients/*.ts',
    '!src/utils/logger.util.ts',
    '!src/routes/*.ts',
    '!src/schemas/*.ts',
    '!src/controllers/*.ts'

  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.test.json',
        diagnostics: {
          ignoreCodes: ['TS151002'],
        },
      },
    ],
  },
};

module.exports = config;
