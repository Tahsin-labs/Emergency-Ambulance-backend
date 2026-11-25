import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export interface IErrorMessage {
  path: string | number;
  message: string;
}

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: IErrorMessage[] = [];

  // Handle AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = [{ path: '', message: err.message }];
  }
  // Handle Zod Validation Error
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.issues.map((issue) => ({
      path: issue.path[issue.path.length - 1] ?? '',
      message: issue.message,
    }));
  }
  // Handle Prisma Known Request Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Duplicate field value entered (Unique constraint violation)';
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      errors = [{ path: target, message: `${target} already exists` }];
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
      errors = [{ path: '', message: (err.meta?.cause as string) || 'Record not found' }];
    } else {
      statusCode = 400;
      message = `Database Error: ${err.message}`;
      errors = [{ path: '', message: err.message }];
    }
  }
  // Handle Prisma Validation Error
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Database Validation Error';
    errors = [{ path: '', message: err.message }];
  }
  // Handle JWT Errors
  else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token has expired';
    errors = [{ path: 'token', message: 'Token has expired. Please sign in again.' }];
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
    errors = [{ path: 'token', message: 'Invalid token provided.' }];
  }
  // Standard generic Error
  else if (err instanceof Error) {
    message = err.message;
    errors = [{ path: '', message: err.message }];
  }

  // Hide detailed internal messages in production for 500 errors
  if (env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    errors = [{ path: '', message: 'An unexpected error occurred. Please try again later.' }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
