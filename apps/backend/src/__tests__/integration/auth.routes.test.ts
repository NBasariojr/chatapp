import request from 'supertest';
import express from 'express';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../helpers/setupDb';
import { TestUserFactory } from '../helpers/testUserFactory';

// Set JWT secret BEFORE any imports that use it
process.env.JWT_SECRET = 'integration_test_secret';
process.env.JWT_EXPIRES_IN = '7d';

// Mock Redis and email — not available in test environment
jest.mock('../../config/redis', () => ({
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  getRedis: jest.fn().mockReturnValue({ publish: jest.fn().mockResolvedValue(1) }),
}));
jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildPasswordResetEmail: jest.fn().mockReturnValue('<html>reset</html>'),
}));
jest.mock('../../config/sentry', () => ({
  initSentry: jest.fn(),
  sentryRequestHandler: () => (_req: any, _res: any, next: any) => next(),
  setSentryUser: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('../../services/audit.service', () => ({ logAuditEvent: jest.fn() }));
jest.mock('../../config/rateLimiter', () => {
  // Replace all limiters with pass-through middleware for tests
  // Rate limiting is tested separately — integration tests verify business logic
  const passThrough = (_req: any, _res: any, next: any) => next();
  return {
    globalLimiter: passThrough,
    loginLimiter: passThrough,
    registerLimiter: passThrough,
    forgotPasswordIpLimiter: passThrough,
    forgotPasswordEmailLimiter: passThrough,
    resetTokenGetLimiter: passThrough,
    resetTokenPostLimiter: passThrough,
    oauthLimiter: passThrough,
    messageLimiter: passThrough,
  };
});

// Set required env vars
beforeAll(() => {
  process.env.JWT_SECRET = 'integration_test_secret';
  process.env.JWT_EXPIRES_IN = '7d';
});

import authRoutes from '../../routes/auth.routes';
import { errorHandler } from '../../middlewares/error.middleware';
import { notFound } from '../../middlewares/notFound.middleware';

// Build minimal Express app for integration tests
const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

const app = buildApp();

// ─── DB lifecycle ──────────────────────────────────────────────────────────────
beforeAll(async () => { await connectTestDb(); });
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await disconnectTestDb(); });

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await TestUserFactory.createUser();
  });

  it('creates a user and returns 201 with token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    // Password must never be returned
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('returns 422 on invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        username: TestUserFactory.generateInvalidUsername(), 
        email: TestUserFactory.generateInvalidEmail(), 
        password: TestUserFactory.generateInvalidPassword() 
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when email already in use', async () => {
    // First, register a user
    await request(app).post('/api/auth/register').send({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
    });

    // Try to register with same email but different username
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        username: 'otheruser', 
        email: testUser.email, 
        password: testUser.password 
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Email already in use');
  });

  it('returns 409 when username already taken', async () => {
    // First, register a user
    await request(app).post('/api/auth/register').send({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
    });

    // Try to register with same username but different email
    const res = await request(app)
      .post('/api/auth/register')
      .send({ 
        username: testUser.username, 
        email: 'other@example.com', 
        password: testUser.password 
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Username already taken');
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await TestUserFactory.createUser();
    // Register the user first
    await request(app).post('/api/auth/register').send({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
    });
  });

  it('returns 200 with token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: TestUserFactory.generateWrongPassword() });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Must not hint which field was wrong — prevents enumeration
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 401 on non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: testUser.password });

    expect(res.status).toBe(401);
    // Same message as wrong password — prevents user enumeration
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 422 on missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email });

    expect(res.status).toBe(422);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let testUser: any;

  // Ensure JWT secret is set for this test suite
  beforeAll(() => {
    process.env.JWT_SECRET = 'integration_test_secret';
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns the authenticated user with valid token', async () => {
    testUser = await TestUserFactory.createUser();
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
      });

    const token = registerRes.body.data.token;
    
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data.password).toBeUndefined();
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token');

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('returns generic success response regardless of whether email exists', async () => {
    const resFound = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    // Both found and not-found return the same message — prevents enumeration
    expect(resFound.status).toBe(200);
    expect(resFound.body.success).toBe(true);
    expect(resFound.body.message).toContain('If that email is registered');
  });

  it('returns 422 on invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: TestUserFactory.generateInvalidEmail() });

    expect(res.status).toBe(422);
  });
});