import mongoose from 'mongoose';

let mongoServer;
let usingMemoryServer = false;

/**
 * Connect to in-memory MongoDB for testing.
 *
 * Strategy:
 *   1. If TEST_MONGODB_URI is set, connect directly (CI / Docker / local mongod).
 *   2. Otherwise try mongodb-memory-server (downloads binary on first run).
 *   3. If the binary download fails, fall back to localhost:27017.
 */
export async function connectTestDb() {
    // Option 1 — explicit URI (CI pipeline provides this)
    const explicitUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
    if (explicitUri) {
        await mongoose.connect(explicitUri);
        return;
    }

    // Option 2 — in-memory server
    try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        usingMemoryServer = true;
        await mongoose.connect(mongoServer.getUri());
        return;
    } catch (err) {
        console.warn('[test-setup] mongodb-memory-server unavailable, trying localhost', err.message);
    }

    // Option 3 — plain localhost
    await mongoose.connect('mongodb://localhost:27017/medibuddy_test');
}

/**
 * Close connection and stop server
 */
export async function closeTestDb() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
    if (usingMemoryServer && mongoServer) {
        await mongoServer.stop();
    }
}

/**
 * Clear all collections
 */
export async function clearTestDb() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

/**
 * Create mock request object
 */
export function mockRequest(options = {}) {
    return {
        body: options.body || {},
        params: options.params || {},
        query: options.query || {},
        headers: options.headers || {},
        userId: options.userId || null,
        validated: options.validated || {},
        user: options.user || null,
        ...options
    };
}

/**
 * Create mock response object
 */
export function mockResponse() {
    const res = {
        statusCode: 200,
        data: null,
        headers: {}
    };

    res.status = (code) => {
        res.statusCode = code;
        return res;
    };

    res.json = (data) => {
        res.data = data;
        return res;
    };

    res.send = (data) => {
        res.data = data;
        return res;
    };

    res.set = (headers) => {
        res.headers = { ...res.headers, ...headers };
        return res;
    };

    return res;
}

/**
 * Create a test user
 */
export async function createTestUser(User, overrides = {}) {
    const user = await User.create({
        phone: '+1' + Math.floor(1000000000 + Math.random() * 9000000000),
        name: 'Test User',
        timezone: 'America/New_York',
        consent: { termsAccepted: true, dataProcessing: true },
        ...overrides
    });
    return user;
}

/**
 * Create a test profile
 */
export async function createTestProfile(Profile, userId, overrides = {}) {
    const profile = await Profile.create({
        name: 'Test Patient',
        ownerId: userId,
        dateOfBirth: new Date('1990-01-01'),
        ...overrides
    });
    return profile;
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(jwt, userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
}
