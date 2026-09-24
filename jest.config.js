module.exports = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/backend/tsconfig.test.json' }],
  },
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/backend/tests/**/*.test.ts',
    '**/backend/src/**/*.spec.ts',
  ],
  modulePaths: ['<rootDir>/backend/src', '<rootDir>/packages'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/packages/$1/src',
  },
  collectCoverageFrom: [
    'backend/src/**/*.ts',
    '!backend/src/**/*.d.ts',
    '!backend/src/models/**',
    '!backend/src/routes/**',
    '!backend/src/controllers/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
