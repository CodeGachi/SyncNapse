import type { Config } from 'jest';

const config: Config = {
  // Basic configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Test patterns
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Coverage configuration - DISABLED by default (use --coverage flag)
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    // Exclude test files
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    // Exclude boilerplate files
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.decorator.ts',
    '!src/**/index.ts',
    '!src/**/*.interface.ts',
    '!src/**/types/*.ts',
    // Exclude config files
    '!src/**/*.config.ts',
    '!src/**/constants/*.ts',
  ],
  coverageDirectory: 'coverage',
  // Only text-summary for speed, lcov for CI tools
  coverageReporters: ['text-summary', 'lcov'],

  // Coverage thresholds - Current: ~30% | Target: 60%
  coverageThreshold: {
    global: {
      statements: 25,
      branches: 15,
      functions: 30,
      lines: 25,
    },
  },

  // Module name mapper for absolute imports
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  // Transform configuration - use isolatedModules for speed
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true, // Faster compilation
      },
    ],
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,

  // Verbose output
  verbose: true,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Default reporter only
  reporters: ['default'],

  // Cache for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};

export default config;
