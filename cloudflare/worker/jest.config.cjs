module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['<rootDir>/cloudflare/worker/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/cloudflare/worker/tsconfig.test.json' }],
  },
  clearMocks: true,
};
