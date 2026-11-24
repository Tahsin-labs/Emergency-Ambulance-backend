import { z } from 'zod';
import { AmbulanceType, AmbulanceStatus } from '@prisma/client';

export const createAmbulanceValidationSchema = z.object({
  body: z.object({
    plateNumber: z.string({ required_error: 'Plate number is required' }).min(3),
    type: z.nativeEnum(AmbulanceType, { required_error: 'Ambulance type is required' }),
    baseFare: z.coerce.number().positive('Base fare must be a positive number').default(500),
    perKmRate: z.coerce.number().positive('Per km rate must be a positive number').default(30),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
});

export const updateAmbulanceValidationSchema = z.object({
  body: z.object({
    type: z.nativeEnum(AmbulanceType).optional(),
    baseFare: z.coerce.number().positive().optional(),
    perKmRate: z.coerce.number().positive().optional(),
    status: z
      .enum(['AVAILABLE', 'OFFLINE', 'MAINTENANCE'], {
        errorMap: () => ({ message: 'Status can only be set to AVAILABLE, OFFLINE, or MAINTENANCE manually' }),
      })
      .optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
});

export const assignDriverValidationSchema = z.object({
  body: z.object({
    driverId: z.string().uuid('Invalid driver ID format').nullable(),
  }),
});

export const ambulanceQueryValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().optional(),
    status: z.nativeEnum(AmbulanceStatus).optional(),
    type: z.nativeEnum(AmbulanceType).optional(),
    hasDriver: z.enum(['true', 'false']).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
});
