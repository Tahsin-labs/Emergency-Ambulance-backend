import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { uploadBuffer, deleteByUrl } from '../../utils/cloudinaryUpload';
import { Role, TripStatus } from '@prisma/client';
import { UserWithoutSensitiveInfo } from '../auth/auth.interface';

const sanitizeUser = (user: any): UserWithoutSensitiveInfo => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, refreshTokenHash, ...sanitized } = user;
  return sanitized;
};

export const UserService = {
  async getMyProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driver: {
          include: {
            ambulance: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new AppError(404, 'User profile not found.');
    }

    return sanitizeUser(user);
  },

  async updateMyProfile(userId: string, payload: { name?: string; phone?: string }): Promise<UserWithoutSensitiveInfo> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new AppError(404, 'User not found.');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: payload,
    });

    return sanitizeUser(updated);
  },

  async updateAvatar(userId: string, imageBuffer: Buffer): Promise<{ avatarUrl: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new AppError(404, 'User not found.');
    }

    // Upload new avatar
    const uploadRes = await uploadBuffer(imageBuffer, 'avatars');
    const newAvatarUrl = uploadRes.secure_url;

    // Delete old avatar from Cloudinary if exists
    if (user.avatarUrl) {
      await deleteByUrl(user.avatarUrl);
    }

    // Save avatarUrl to database
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: newAvatarUrl },
    });

    return { avatarUrl: newAvatarUrl };
  },

  async deleteMyProfile(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driver: {
          include: {
            ambulance: {
              include: {
                trips: {
                  where: {
                    status: {
                      in: [
                        TripStatus.DISPATCHED,
                        TripStatus.EN_ROUTE,
                        TripStatus.ARRIVED_AT_PICKUP,
                        TripStatus.PICKED_UP,
                        TripStatus.EN_ROUTE_TO_HOSPITAL,
                        TripStatus.ARRIVED_AT_HOSPITAL,
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new AppError(404, 'User not found.');
    }

    // If user is DRIVER, check if there is an active trip
    if (user.role === Role.DRIVER && user.driver?.ambulance?.trips?.length) {
      throw new AppError(400, 'Cannot delete driver account while an active trip is in progress.');
    }

    // Soft delete user and clear refresh token
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        refreshTokenHash: null,
      },
    });
  },
};
