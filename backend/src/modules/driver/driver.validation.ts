import { z } from 'zod';
import { TripStatus } from '@prisma/client';

export const driverAvailabilityValidationSchema = z.object({
  body: z.object({
    isOnDuty: z.boolean({ required_error: 'isOnDuty boolean is required' }),
  }),
});

export const driverLocationValidationSchema = z.object({
  body: z.object({
    lat: z.number({ required_error: 'Latitude is required' }).min(-90).max(90),
    lng: z.number({ required_error: 'Longitude is required' }).min(-180).max(180),
  }),
});

export const driverQueryValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().optional(),
    isOnDuty: z.enum(['true', 'false']).optional(),
  }),
});

export const driverTripsQueryValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().optional(),
    status: z.nativeEnum(TripStatus).optional(),
  }),
});
