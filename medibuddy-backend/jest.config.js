export default {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    transform: {},
    moduleFileExtensions: ['js', 'mjs'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 60000,
    maxWorkers: 1,
    setupFilesAfterEnv: [],
    moduleNameMapper: {},
    // Allow mongodb-memory-server to find pre-downloaded binary via env or
    // fall back to system mongo.  Set MONGOMS_SYSTEM_BINARY or
    // MONGOMS_DOWNLOAD_URL in your shell / .env to avoid download failures.
    globalSetup: undefined
};
