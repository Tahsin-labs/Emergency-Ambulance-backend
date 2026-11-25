import { z } from 'zod';
import { TripStatus } from '@prisma/client';

export const updateTripStatusValidationSchema = z.object({
  body: z.object({
    status: z
      .nativeEnum(TripStatus, { required_error: 'Status is required' })
      .refine((val) => val !== TripStatus.CANCELLED, {
        message: 'Trip status CANCELLED cannot be set via this endpoint. Use the request cancel endpoint.',
      }),
    note: z.string().optional(),
  }),
});

export const assignTripHospitalValidationSchema = z.object({
  body: z.object({
    hospitalId: z.string().uuid('Invalid hospital ID format').optional(),
  }),
});

export const tripQueryValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    status: z.nativeEnum(TripStatus).optional(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
    ambulanceId: z.string().uuid().optional(),
    hospitalId: z.string().uuid().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  }),
});
