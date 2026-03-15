/**
 * Application error hierarchy.
 *
 * isOperational: true  → Expected, user-facing error.
 *                         Logs a warning, NOT sent to Sentry.
 *                         Examples: 404, 401, 400 validation
 *
 * isOperational: false → Unexpected programmer/infrastructure error.
 *                         Logs an error, SENT to Sentry.
 *                         Examples: DB write failure, unhandled edge case
 */

// Base
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 4xx Client Errors (isOperational: true — never sent to Sentry)
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, true);
  }
}

// OAuth
export class OAuthVerificationError extends AppError {
  constructor(message: string) {
    super(message, 401, true);
    this.name = 'OAuthVerificationError';
  }
}

// 5xx Infrastructure Errors (isOperational: false — SENT to Sentry)
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, false); // Not operational — unexpected DB failure
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message ?? `External service error: ${service}`, 502, false);
  }
}