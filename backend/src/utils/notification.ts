import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

type TransactionClient = Prisma.TransactionClient;

/**
 * Creates an in-app notification row for a specific user.
 * Accepts either an existing Prisma transaction client or defaults to the singleton prisma client.
 */
export const createNotification = async (
  clientOrTx: TransactionClient | null | undefined,
  userId: string,
  title: string,
  message: string,
  type: string,
): Promise<void> => {
  const db = clientOrTx || prisma;
  try {
    await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
