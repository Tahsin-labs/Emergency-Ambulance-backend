import { z } from 'zod';

export const createHospitalValidationSchema = z.object({
  body: z
    .object({
      name: z.string({ required_error: 'Hospital name is required' }).min(2),
      address: z.string({ required_error: 'Hospital address is required' }).min(3),
      city: z.string({ required_error: 'City is required' }).min(2),
      lat: z.coerce.number({ required_error: 'Latitude is required' }).min(-90).max(90),
      lng: z.coerce.number({ required_error: 'Longitude is required' }).min(-180).max(180),
      phone: z.string({ required_error: 'Phone number is required' }).min(5),
      specialties: z.array(z.string()).min(1, 'At least one specialty is required'),
      totalBeds: z.coerce.number().int().positive('Total beds must be a positive integer'),
      availableBeds: z.coerce.number().int().min(0, 'Available beds cannot be negative'),
      hasEmergency: z.coerce.boolean().default(true),
    })
    .refine((data) => data.availableBeds <= data.totalBeds, {
      message: 'Available beds cannot exceed total beds',
      path: ['availableBeds'],
    }),
});

export const updateHospitalValidationSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      address: z.string().min(3).optional(),
      city: z.string().min(2).optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional(),
      phone: z.string().min(5).optional(),
      specialties: z.array(z.string()).optional(),
      totalBeds: z.coerce.number().int().positive().optional(),
      availableBeds: z.coerce.number().int().min(0).optional(),
      hasEmergency: z.coerce.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.availableBeds !== undefined && data.totalBeds !== undefined) {
          return data.availableBeds <= data.totalBeds;
        }
        return true;
      },
      {
        message: 'Available beds cannot exceed total beds',
        path: ['availableBeds'],
      },
    ),
});

export const hospitalQueryValidationSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().optional(),
    limit: z.coerce.number().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().optional(),
    city: z.string().optional(),
    specialty: z.string().optional(),
    hasEmergency: z.enum(['true', 'false']).optional(),
  }),
});

export const nearbyHospitalQueryValidationSchema = z.object({
  query: z.object({
    lat: z.coerce.number({ required_error: 'Latitude is required' }).min(-90).max(90),
    lng: z.coerce.number({ required_error: 'Longitude is required' }).min(-180).max(180),
    specialty: z.string().optional(),
    radiusKm: z.coerce.number().positive().default(20),
  }),
});
