import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

export const PaymentValidation = {
  initiateBody: z.object({
    body: z.object({
      tripId: z.string({ required_error: 'tripId is required' }).uuid('Invalid tripId format'),
    }),
  }),

  getPaymentsQuery: z.object({
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      status: z.nativeEnum(PaymentStatus).optional(),
      userId: z.string().uuid().optional(),
      searchTerm: z.string().optional(),
      from: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
      to: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
    }),
  }),

  getMyPaymentsQuery: z.object({
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
      status: z.nativeEnum(PaymentStatus).optional(),
    }),
  }),
};
