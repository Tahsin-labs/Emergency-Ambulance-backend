import { z } from 'zod';
import { Priority, RequestStatus } from '@prisma/client';
import { EmergencyTypeEnum } from './priority.util';

export const createEmergencyRequestValidationSchema = z.object({
  body: z.object({
    emergencyType: z.enum(EmergencyTypeEnum, { required_error: 'Emergency type is required' }),
    description: z.string().optional(),
    pickupAddress: z.string({ required_error: 'Pickup address is required' }).min(3),
    pickupLat: z.coerce.number({ required_error: 'Pickup latitude is required' }).min(-90).max(90),
    pickupLng: z.coerce.number({ required_error: 'Pickup longitude is required' }).min(-180).max(180),
    patientName: z.string().min(2).optional(),
    patientPhone: z.string().min(5).optional(),
  }),
});

export const cancelEmergencyRequestValidationSchema = z.object({
  body: z.object({
    reason: z.string({ required_error: 'Cancellation reason is required' }).min(3),
  }),
});

export const overridePriorityValidationSchema = z.object({
  body: z.object({
    priority: z.nativeEnum(Priority, { required_error: 'Priority is required' }),
  }),
});

export const manualDispatchValidationSchema = z.object({
  body: z.object({
    ambulanceId: z.string().uuid('Invalid ambulance ID format').optional(),
  }),
});

export const emergencyRequestQueryValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().optional(),
    status: z.nativeEnum(RequestStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  }),
});
