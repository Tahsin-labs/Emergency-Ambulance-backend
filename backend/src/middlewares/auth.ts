import { Request, Response, NextFunction } from 'express';
import { Secret } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { UserStatus } from '@prisma/client';

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Unauthorized access! Token not provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, env.JWT_ACCESS_SECRET as Secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
    });

    if (!user || user.deletedAt) {
      throw new AppError(401, 'User associated with this token no longer exists.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, 'Your account is suspended.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authenticate = auth;
