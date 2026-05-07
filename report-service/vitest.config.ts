import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        // Infrastructure / integration-only (no unit tests)
        'src/server.ts',
        'src/app.ts',
        'src/config/**',
        'src/clients/employeeClient.ts',
        'src/clients/contractClient.ts',
        'src/clients/vacationClient.ts',
        'src/repositories/**',
        'src/routes/**',
        'src/entities/**',
        'src/dtos/**',
        'src/shared/enums/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
