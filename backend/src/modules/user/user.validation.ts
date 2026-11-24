import { z } from 'zod';

export const updateProfileValidationSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, 'Name must be at least 2 characters').optional(),
      phone: z
        .string()
        .regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Invalid Bangladesh phone number')
        .optional(),
    })
    .strict('Only name and phone can be updated'),
});
