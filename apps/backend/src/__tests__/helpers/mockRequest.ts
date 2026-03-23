import type { Request, Response } from 'express';

/**
 * Creates a mock Express Request with sensible defaults.
 * Override any field by passing a partial object.
 */
export const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {
      'user-agent': 'jest-test-agent',
      'x-forwarded-for': '127.0.0.1',
    },
    ip: '127.0.0.1',
    method: 'POST',
    path: '/',
    ...overrides,
  } as unknown as Request;
};

/**
 * Creates a mock Express Response with jest.fn() for all methods.
 * Usage: const res = mockResponse(); expect(res.status).toHaveBeenCalledWith(201);
 */
export const mockResponse = (): Response => {
  const res = {} as Response;

  // Chain pattern: res.status(201).json({ ... })
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);

  return res;
};

/**
 * Mock NextFunction — captures errors passed via next(error)
 */
export const mockNext = jest.fn();