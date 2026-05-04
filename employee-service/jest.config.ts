import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.test.json',
        diagnostics: {
          // TS151002 is a false-positive ts-jest internal warning triggered by
          // isolatedModules + static ESM imports; the code still compiles fine.
          ignoreCodes: ['TS151002'],
        },
      },
    ],
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

export default config;
