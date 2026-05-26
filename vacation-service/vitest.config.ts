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
        // Infrastructure / integration-only modules (require real DB or SMTP)
        'src/server.ts',
        'src/app.ts',
        'src/config/**',
        'src/repositories/**',
        'src/routes/**',
        'src/entities/**',
        'src/dtos/**',
        'src/shared/enums/**',
      ],
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 50,
        statements: 70,
      },
    },
  },
});
