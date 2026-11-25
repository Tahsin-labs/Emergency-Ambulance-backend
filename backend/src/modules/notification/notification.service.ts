import { prisma } from '../../config/prisma';
import AppError from '../../utils/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';

export class NotificationService {
  static async getMyNotifications(userId: string, query: Record<string, any>) {
    const qb = new QueryBuilder(query);
    const { skip, take, page, limit } = qb.getPagination();

    const where: Record<string, any> = {
      userId,
    };

    if (query.isRead !== undefined && query.isRead !== '') {
      where.isRead = query.isRead === 'true';
    }

    if (query.type) {
      where.type = query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
      data: notifications,
    };
  }

  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  static async markOneAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    if (notification.userId !== userId) {
      throw new AppError(403, 'Forbidden: This notification does not belong to you');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updated;
  }
}
