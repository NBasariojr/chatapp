import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { captureException } from '../config/sentry';

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const appError = err instanceof AppError ? err : null;
  const statusCode = appError?.statusCode ?? 500;
  const isOperational = appError?.isOperational ?? false;

  // Sentry Capture
  if (statusCode >= 500 && !isOperational) {
    captureException(err, {
      userId: (req as Request & { user?: { _id?: unknown } }).user?._id?.toString(),
      tags: {
        statusCode: String(statusCode),
        method: req.method,
        path: req.path,
      },
      extra: {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
      },
    });
  }

  // Response
  const message = isOperational ? err.message : 'Internal server error';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error ${statusCode}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};