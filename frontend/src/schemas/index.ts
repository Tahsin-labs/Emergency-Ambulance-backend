import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const emergencyRequestSchema = z.object({
  emergencyType: z.enum([
    "CARDIAC",
    "ACCIDENT",
    "STROKE",
    "BREATHING",
    "PREGNANCY",
    "BLEEDING",
    "BURN",
    "FRACTURE",
    "FEVER",
    "SEIZURE",
    "UNCONSCIOUS",
    "OTHER",
  ]),
  description: z.string().min(5, "Please describe the patient's condition"),
  pickupAddress: z.string().min(5, "Pickup address is required"),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
});

export const driverAvailabilitySchema = z.object({
  status: z.enum(["OFF_DUTY", "AVAILABLE"]),
});

export const driverLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const ambulanceSchema = z.object({
  plateNumber: z.string().min(3, "Plate number is required"),
  type: z.enum(["BASIC", "ADVANCED", "ICU"]),
  baseFare: z.number().positive("Base fare must be positive"),
  perKmRate: z.number().positive("Per km rate must be positive"),
});

export const hospitalSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  contactNumber: z.string().min(7, "Contact number is required"),
  icuBedsTotal: z.number().int().nonnegative(),
  icuBedsAvailable: z.number().int().nonnegative(),
  generalBedsTotal: z.number().int().nonnegative(),
  generalBedsAvailable: z.number().int().nonnegative(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EmergencyRequestInput = z.infer<typeof emergencyRequestSchema>;
export type AmbulanceInput = z.infer<typeof ambulanceSchema>;
export type HospitalInput = z.infer<typeof hospitalSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
