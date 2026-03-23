import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../helpers/setupDb';

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
  const validPayload = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password1',
  };

  it('creates a user and returns 201 with token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
    // Password must never be returned
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('returns 422 on invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'x', email: 'bad', password: 'weak' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when email already in use', async () => {
    await request(app).post('/api/auth/register').send(validPayload);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, username: 'otheruser' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Email already in use');
  });

  it('returns 409 when username already taken', async () => {
    await request(app).post('/api/auth/register').send(validPayload);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'other@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Username already taken');
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const registerPayload = {
    username: 'loginuser',
    email: 'login@example.com',
    password: 'Password1',
  };

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(registerPayload);
  });

  it('returns 200 with token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Must not hint which field was wrong — prevents enumeration
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 401 on non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1' });

    expect(res.status).toBe(401);
    // Same message as wrong password — prevents user enumeration
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 422 on missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com' });

    expect(res.status).toBe(422);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns the authenticated user with valid token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'meuser', email: 'me@example.com', password: 'Password1' });

    const token = registerRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('me@example.com');
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
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
  });
});