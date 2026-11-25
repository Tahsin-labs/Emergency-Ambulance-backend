import { z } from 'zod';

export const NotificationValidation = {
  getNotificationsQuery: z.object({
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      isRead: z.enum(['true', 'false']).optional(),
      type: z.string().optional(),
    }),
  }),
};
