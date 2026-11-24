import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      return next(new AppError(401, 'Unauthorized. Please log in.'));
    }

    if (roles.length && !roles.includes(user.role)) {
      return next(new AppError(403, 'Forbidden! You do not have permission to access this resource.'));
    }

    next();
  };
};
