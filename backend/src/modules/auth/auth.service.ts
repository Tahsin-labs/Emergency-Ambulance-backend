import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { createToken, verifyToken } from '../../utils/jwt';
import { uploadBuffer } from '../../utils/cloudinaryUpload';
import { AuthProvider, Role, UserStatus, User } from '@prisma/client';
import { ILoginResponse, IRegisterDriverInput, UserWithoutSensitiveInfo } from './auth.interface';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const sanitizeUser = (user: User): UserWithoutSensitiveInfo => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, refreshTokenHash, ...userWithoutSecrets } = user;
  return userWithoutSecrets;
};

const generateTokens = async (user: User): Promise<{ accessToken: string; refreshToken: string }> => {
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(tokenPayload, env.JWT_ACCESS_SECRET, '15m');
  const refreshToken = createToken(tokenPayload, env.JWT_REFRESH_SECRET, '7d');

  const hashedRefresh = hashRefreshToken(refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: hashedRefresh },
  });

  return { accessToken, refreshToken };
};

export const AuthService = {
  async register(payload: { name: string; email: string; phone?: string; password: string }): Promise<ILoginResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw new AppError(409, 'A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const newUser = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        passwordHash,
        role: Role.PATIENT,
        provider: AuthProvider.LOCAL,
        status: UserStatus.ACTIVE,
      },
    });

    const tokens = await generateTokens(newUser);

    return {
      user: sanitizeUser(newUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async login(payload: { email: string; password: string }): Promise<ILoginResponse> {
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user || user.deletedAt) {
      throw new AppError(401, 'Invalid email or password.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, 'Your account has been suspended. Please contact support.');
    }

    if (!user.passwordHash) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const tokens = await generateTokens(user);

    return {
      user: sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async googleLogin(idToken: string): Promise<ILoginResponse> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(503, 'Google authentication is currently not configured on this server.');
    }

    let payload: any;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error: any) {
      throw new AppError(401, `Invalid Google ID token: ${error.message}`);
    }

    if (!payload || !payload.email) {
      throw new AppError(400, 'Unable to retrieve user email from Google token.');
    }

    const { email, name, sub: googleId, picture } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      if (user.deletedAt) {
        throw new AppError(401, 'User account has been deleted.');
      }
      if (user.status === UserStatus.SUSPENDED) {
        throw new AppError(403, 'Your account has been suspended.');
      }

      // Link googleId if not linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl: user.avatarUrl || picture,
          },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Google User',
          googleId,
          avatarUrl: picture,
          role: Role.PATIENT,
          provider: AuthProvider.GOOGLE,
          status: UserStatus.ACTIVE,
        },
      });
    }

    const tokens = await generateTokens(user);

    return {
      user: sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  async refreshToken(incomingToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!incomingToken) {
      throw new AppError(401, 'Refresh token is required.');
    }

    let decoded: any;
    try {
      decoded = verifyToken(incomingToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
    });

    if (!user || user.deletedAt) {
      throw new AppError(401, 'User not found or deleted.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, 'Account is suspended.');
    }

    if (!user.refreshTokenHash) {
      throw new AppError(401, 'Refresh token has been revoked. Please sign in again.');
    }

    const hashedIncoming = hashRefreshToken(incomingToken);
    if (hashedIncoming !== user.refreshTokenHash) {
      // Possible reuse attack: revoke refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new AppError(401, 'Refresh token reuse detected or invalid token. Please log in again.');
    }

    // Token rotation
    return await generateTokens(user);
  },

  async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  },

  async changePassword(userId: string, payload: { oldPassword: string; newPassword: string }): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new AppError(404, 'User not found.');
    }

    if (!user.passwordHash) {
      throw new AppError(400, 'Password cannot be changed for accounts registered with Google.');
    }

    const isMatch = await bcrypt.compare(payload.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError(400, 'Current password does not match.');
    }

    const newPasswordHash = await bcrypt.hash(payload.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenHash: null, // Invalidate existing sessions
      },
    });
  },

  async registerDriver(payload: IRegisterDriverInput): Promise<{ user: UserWithoutSensitiveInfo; driver: any }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (existingUser) {
      throw new AppError(409, 'User with this email already exists.');
    }

    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber: payload.licenseNumber },
    });
    if (existingLicense) {
      throw new AppError(409, 'A driver with this license number already exists.');
    }

    let licenseImageUrl: string | null = null;
    if (payload.licenseImageBuffer) {
      try {
        const uploadRes = await uploadBuffer(payload.licenseImageBuffer, 'licenses');
        licenseImageUrl = uploadRes.secure_url;
      } catch (err: any) {
        throw new AppError(500, `Failed to upload license image: ${err.message}`);
      }
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    // Atomic transaction creating User(role DRIVER) + Driver
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          passwordHash,
          role: Role.DRIVER,
          provider: AuthProvider.LOCAL,
          status: UserStatus.ACTIVE,
        },
      });

      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          licenseNumber: payload.licenseNumber,
          licenseImageUrl,
          isOnDuty: false,
        },
      });

      return { user: sanitizeUser(user), driver };
    });

    return result;
  },
};
