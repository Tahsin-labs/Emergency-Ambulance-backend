import { Router } from 'express';
import { DriverController } from './driver.controller';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { Role } from '@prisma/client';
import {
  driverAvailabilityValidationSchema,
  driverLocationValidationSchema,
  driverQueryValidationSchema,
  driverTripsQueryValidationSchema,
} from './driver.validation';

const router = Router();

// Admin-only driver listing
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest(driverQueryValidationSchema),
  DriverController.getAllDrivers,
);

// Authenticated Driver operations
router.patch(
  '/me/availability',
  authenticate,
  authorize(Role.DRIVER),
  validateRequest(driverAvailabilityValidationSchema),
  DriverController.updateAvailability,
);

router.patch(
  '/me/location',
  authenticate,
  authorize(Role.DRIVER),
  validateRequest(driverLocationValidationSchema),
  DriverController.updateLocation,
);

router.get(
  '/me/trips',
  authenticate,
  authorize(Role.DRIVER),
  validateRequest(driverTripsQueryValidationSchema),
  DriverController.getMyTrips,
);

router.get(
  '/me/current-trip',
  authenticate,
  authorize(Role.DRIVER),
  DriverController.getCurrentTrip,
);

export const DriverRoutes = router;
