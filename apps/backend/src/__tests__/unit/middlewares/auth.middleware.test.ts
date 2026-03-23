import jwt from 'jsonwebtoken';
import { mockRequest, mockResponse, mockNext } from '../../helpers/mockRequest';

jest.mock('../../../models/user.model');
jest.mock('../../../config/sentry', () => ({ setSentryUser: jest.fn() }));
jest.mock('../../../services/audit.service', () => ({ logAuditEvent: jest.fn() }));

import { authenticate, requireRole } from '../../../middlewares/auth.middleware';
import { User } from '../../../models/user.model';

const MockUser = User as jest.Mocked<typeof User>;

const mockUserDoc = {
  _id: { toHexString: () => '507f1f77bcf86cd799439011' },
  role: 'user',
  passwordChangedAt: null,
};

const validToken = jwt.sign(
  { id: '507f1f77bcf86cd799439011', role: 'user', iat: Math.floor(Date.now() / 1000) - 10 },
  'test_secret',
);

// Set JWT_SECRET for all tests
beforeAll(() => { process.env.JWT_SECRET = 'test_secret'; });
afterAll(() => { delete process.env.JWT_SECRET; });

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate', () => {
  it('sets req.user and calls next() for valid token', async () => {
    const req = mockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });
    const res = mockResponse();

    const selectMock = { select: jest.fn().mockResolvedValue(mockUserDoc) };
    (MockUser.findById as jest.Mock).mockReturnValue(selectMock);

    await authenticate(req as any, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(); // called with no args = success
    expect((req as any).user).toEqual({
      _id: '507f1f77bcf86cd799439011',
      role: 'user',
    });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();

    await authenticate(req as any, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 and logs audit event for invalid token', async () => {
    const req = mockRequest({
      headers: { authorization: 'Bearer invalid.token.here' },
    });
    const res = mockResponse();

    await authenticate(req as any, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    const { logAuditEvent } = require('../../../services/audit.service');
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.token.invalid' }),
    );
  });

  it('returns 401 when user no longer exists in DB', async () => {
    const req = mockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });
    const res = mockResponse();

    const selectMock = { select: jest.fn().mockResolvedValue(null) };
    (MockUser.findById as jest.Mock).mockReturnValue(selectMock);

    await authenticate(req as any, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found' }),
    );
  });

  it('returns 401 when token was issued before password change', async () => {
    const oldToken = jwt.sign(
      { id: '507f1f77bcf86cd799439011', role: 'user', iat: 1000 },
      'test_secret',
    );
    const req = mockRequest({
      headers: { authorization: `Bearer ${oldToken}` },
    });
    const res = mockResponse();

    const userWithChangedPassword = {
      ...mockUserDoc,
      passwordChangedAt: new Date(Date.now() - 5000), // changed 5s ago, token issued at epoch
    };
    const selectMock = { select: jest.fn().mockResolvedValue(userWithChangedPassword) };
    (MockUser.findById as jest.Mock).mockReturnValue(selectMock);

    await authenticate(req as any, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Password recently changed') }),
    );
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('calls next() when user has the required role', () => {
    const req = mockRequest({ user: { _id: 'abc', role: 'admin' } } as any);
    const res = mockResponse();

    requireRole('admin')(req as any, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('returns 403 when user lacks the required role', () => {
    const req = mockRequest({ user: { _id: 'abc', role: 'user' } } as any);
    const res = mockResponse();

    requireRole('admin')(req as any, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when no user is attached to request', () => {
    const req = mockRequest({} as any);
    const res = mockResponse();

    requireRole('admin')(req as any, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts multiple roles', () => {
    const req = mockRequest({ user: { _id: 'abc', role: 'moderator' } } as any);
    const res = mockResponse();

    requireRole('admin', 'moderator')(req as any, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });
});