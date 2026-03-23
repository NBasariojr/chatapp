import { mockRequest, mockResponse, mockNext } from '../../helpers/mockRequest';
import { TestUserFactory } from '../../helpers/testUserFactory';

// ─── Mock all external dependencies ──────────────────────────────────────────
// These are mocked at module level so they never touch real DB/Redis/email

jest.mock('../../../models/user.model');
jest.mock('../../../config/redis', () => ({
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  getRedis: jest.fn().mockReturnValue({
    publish: jest.fn().mockResolvedValue(1),
  }),
}));
jest.mock('../../../services/audit.service', () => ({
  logAuditEvent: jest.fn(),
}));
jest.mock('../../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildPasswordResetEmail: jest.fn().mockReturnValue('<html>reset</html>'),
}));
jest.mock('../../../utils/token', () => ({
  generateResetToken: jest.fn().mockReturnValue({
    rawToken: 'a'.repeat(64),
    hashedToken: 'hashed_token_value',
  }),
  hashToken: jest.fn().mockReturnValue('hashed_token_value'),
}));
jest.mock('../../../services/oauth.service', () => ({
  exchangeAndVerifyGoogleCode: jest.fn(),
  upsertGoogleUser: jest.fn(),
}));
jest.mock('../../../config', () => ({
  config: { clientUrl: 'http://localhost:3000' },
  jwt: { secret: 'test_secret', expiresIn: '7d' },
}));

// ─── Import AFTER mocks are set up ───────────────────────────────────────────
import { register, login, logout, getMe, forgotPassword, googleAuth } from '../../../controllers/auth.controller';
import { User } from '../../../models/user.model';
import { cacheSet, cacheDel } from '../../../config/redis';
import { logAuditEvent } from '../../../services/audit.service';
import { sendEmail } from '../../../utils/email';
import { ValidationError, ConflictError, UnauthorizedError, NotFoundError } from '../../../utils/errors';

const MockUser = User as jest.Mocked<typeof User>;

// ─── Shared test data ─────────────────────────────────────────────────────────
const mockUserDoc = {
  _id: { toString: () => '507f1f77bcf86cd799439011', toHexString: () => '507f1f77bcf86cd799439011' },
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  authProvider: 'local',
  password: TestUserFactory.generateTestHash(),
  comparePassword: jest.fn(),
  populate: jest.fn(),
};

// ─── register ────────────────────────────────────────────────────────────────

describe('register', () => {
  let testUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a user and returns 201 with token on valid input', async () => {
    testUser = await TestUserFactory.createUser();
    const req = mockRequest({
      body: {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
      },
    });
    const res = mockResponse();

    (MockUser.findOne as jest.Mock).mockResolvedValue(null);
    (MockUser.create as jest.Mock).mockResolvedValue(mockUserDoc);

    await register(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(cacheSet).toHaveBeenCalledWith(
      expect.stringContaining('session:'),
      expect.any(Object),
      expect.any(Number),
    );
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.register.success' }),
    );
  });

  it('calls next(ValidationError) when body is invalid', async () => {
    const req = mockRequest({ 
      body: { 
        username: TestUserFactory.generateInvalidUsername(), 
        email: TestUserFactory.generateInvalidEmail(), 
        password: TestUserFactory.generateInvalidPassword() 
      } 
    });
    const res = mockResponse();

    await register(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next(ConflictError) when email already in use', async () => {
    testUser = await TestUserFactory.createUser();
    const req = mockRequest({
      body: { username: 'newuser', email: testUser.email, password: testUser.password },
    });
    const res = mockResponse();

    (MockUser.findOne as jest.Mock).mockResolvedValue({ ...mockUserDoc, email: testUser.email });

    await register(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ConflictError));
    expect(mockNext.mock.calls[0][0].message).toBe('Email already in use');
  });

  it('calls next(ConflictError) when username already taken', async () => {
    testUser = await TestUserFactory.createUser();
    const req = mockRequest({
      body: { username: testUser.username, email: 'other@example.com', password: testUser.password },
    });
    const res = mockResponse();

    (MockUser.findOne as jest.Mock).mockResolvedValue({
      ...mockUserDoc,
      email: 'different@example.com',
      username: testUser.username,
    });

    await register(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ConflictError));
    expect(mockNext.mock.calls[0][0].message).toBe('Username already taken');
  });

  it('calls next(error) when User.create throws', async () => {
    testUser = await TestUserFactory.createUser();
    const req = mockRequest({
      body: { username: testUser.username, email: testUser.email, password: testUser.password },
    });
    const res = mockResponse();
    const dbError = new Error('DB connection failed');

    (MockUser.findOne as jest.Mock).mockResolvedValue(null);
    (MockUser.create as jest.Mock).mockRejectedValue(dbError);

    await register(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(dbError);
  });
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('login', () => {
  let testUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with token on valid credentials', async () => {
    testUser = await TestUserFactory.createUser();
    const validBody = { email: testUser.email, password: testUser.password };
    const req = mockRequest({ body: validBody });
    const res = mockResponse();

    mockUserDoc.comparePassword.mockResolvedValue(true);
    const selectMock = { select: jest.fn().mockResolvedValue(mockUserDoc) };
    (MockUser.findOne as jest.Mock).mockReturnValue(selectMock);
    (MockUser.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    await login(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Login successful' }),
    );
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.success' }),
    );
  });

  it('calls next(UnauthorizedError) when user not found', async () => {
    testUser = await TestUserFactory.createUser();
    const validBody = { email: testUser.email, password: testUser.password };
    const req = mockRequest({ body: validBody });
    const res = mockResponse();

    const selectMock = { select: jest.fn().mockResolvedValue(null) };
    (MockUser.findOne as jest.Mock).mockReturnValue(selectMock);

    await login(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    // login.failure is NOT logged when user not found — prevents user enumeration
    expect(logAuditEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.failure' }),
    );
  });

  it('calls next(UnauthorizedError) and logs failure on wrong password', async () => {
    testUser = await TestUserFactory.createUser();
    const validBody = { email: testUser.email, password: testUser.password };
    const req = mockRequest({ body: validBody });
    const res = mockResponse();

    mockUserDoc.comparePassword.mockResolvedValue(false);
    const selectMock = { select: jest.fn().mockResolvedValue(mockUserDoc) };
    (MockUser.findOne as jest.Mock).mockReturnValue(selectMock);

    await login(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.failure' }),
    );
  });

  it('calls next(UnauthorizedError) for Google-only account', async () => {
    testUser = await TestUserFactory.createUser();
    const validBody = { email: testUser.email, password: testUser.password };
    const req = mockRequest({ body: validBody });
    const res = mockResponse();

    const googleOnlyUser = { ...mockUserDoc, authProvider: 'google', password: null };
    const selectMock = { select: jest.fn().mockResolvedValue(googleOnlyUser) };
    (MockUser.findOne as jest.Mock).mockReturnValue(selectMock);

    await login(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(mockNext.mock.calls[0][0].message).toContain('Google Sign-In');
  });

  it('calls next(ValidationError) on invalid body format', async () => {
    const req = mockRequest({ 
      body: { 
        email: TestUserFactory.generateInvalidEmail(), 
        password: TestUserFactory.generateInvalidPassword() 
      } 
    });
    const res = mockResponse();

    await login(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('clears Redis session and returns success', async () => {
    const req = mockRequest({ user: { _id: '507f1f77bcf86cd799439011', role: 'user' } } as any);
    const res = mockResponse();

    (MockUser.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    await logout(req as any, res, mockNext);

    expect(cacheDel).toHaveBeenCalledWith('session:507f1f77bcf86cd799439011');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: 'Logged out successfully' }),
    );
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.logout' }),
    );
  });

  it('still returns success when no user is attached to request', async () => {
    const req = mockRequest({} as any);
    const res = mockResponse();

    await logout(req as any, res, mockNext);

    expect(cacheDel).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});

// ─── getMe ───────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('returns the authenticated user', async () => {
    const req = mockRequest({ user: { _id: '507f1f77bcf86cd799439011', role: 'user' } } as any);
    const res = mockResponse();

    (MockUser.findById as jest.Mock).mockResolvedValue(mockUserDoc);

    await getMe(req as any, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockUserDoc }),
    );
  });

  it('calls next(NotFoundError) when user does not exist', async () => {
    const req = mockRequest({ user: { _id: 'deleted_user_id', role: 'user' } } as any);
    const res = mockResponse();

    (MockUser.findById as jest.Mock).mockResolvedValue(null);

    await getMe(req as any, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

// ─── forgotPassword ───────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  let testUser: any;

  it('returns generic response when user not found — prevents enumeration', async () => {
    const req = mockRequest({ body: { email: 'nonexistent@example.com' } });
    const res = mockResponse();

    const selectMock = { select: jest.fn().mockResolvedValue(null) };
    (MockUser.findOne as jest.Mock).mockReturnValue(selectMock);

    await forgotPassword(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends reset email and returns generic response for valid user', async () => {
    testUser = await TestUserFactory.createUser();
    const req = mockRequest({ body: { email: testUser.email } });
    const res = mockResponse();

    const userWithPassword = { ...mockUserDoc, password: TestUserFactory.generateTestHash() };
    const selectMock = { select: jest.fn().mockResolvedValue(userWithPassword) };
    (MockUser.findOne as jest.Mock).mockReturnValue(selectMock);
    (MockUser.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

    await forgotPassword(req, res, mockNext);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: mockUserDoc.email }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.password_reset.requested' }),
    );
  });

  it('calls next(ValidationError) on invalid email format', async () => {
    const req = mockRequest({ body: { email: TestUserFactory.generateInvalidEmail() } });
    const res = mockResponse();

    await forgotPassword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('calls next(error) and clears token when email send fails', async () => {
    testUser = await TestUserFactory.createUser();
    const req = mockRequest({ body: { email: testUser.email } });
    const res = mockResponse();

    const userWithPassword = { ...mockUserDoc, password: TestUserFactory.generateTestHash() };
    const selectMock = { select: jest.fn().mockResolvedValue(userWithPassword) };
    (MockUser.findOne as jest.Mock).mockReturnValue(selectMock);
    (MockUser.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
    (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP error'));

    await forgotPassword(req, res, mockNext);

    // Token must be cleared when email fails
    expect(MockUser.findByIdAndUpdate).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ $unset: expect.anything() }),
    );
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});