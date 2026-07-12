import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify('test'), __COMMIT_SHA__: JSON.stringify('test') },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/domain/**', 'src/application/**', 'src/infrastructure/db/**'] }
  }
});
