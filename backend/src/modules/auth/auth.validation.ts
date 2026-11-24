import { z } from 'zod';

export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    phone: z
      .string()
      .regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Invalid Bangladesh phone number format (e.g. +8801711000000 or 01711000000)')
      .optional(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const loginValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

export const googleAuthValidationSchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: 'idToken is required' }).min(1, 'idToken cannot be empty'),
  }),
});

export const refreshTokenValidationSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

export const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({ required_error: 'Old password is required' }),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
  }),
});

export const registerDriverValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).min(2),
    email: z.string({ required_error: 'Email is required' }).email(),
    phone: z
      .string()
      .regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Invalid Bangladesh phone number')
      .optional(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
    licenseNumber: z.string({ required_error: 'License number is required' }).min(3),
  }),
});
