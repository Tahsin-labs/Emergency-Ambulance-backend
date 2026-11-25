import { Router } from 'express';
import { TripController } from './trip.controller';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { Role } from '@prisma/client';
import {
  updateTripStatusValidationSchema,
  assignTripHospitalValidationSchema,
  tripQueryValidationSchema,
} from './trip.validation';

const router = Router();

// Admin incident history
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest(tripQueryValidationSchema),
  TripController.getAllTrips,
);

// Single trip detail & timeline (Owner Patient, Assigned Driver, or Admin)
router.get('/:id', authenticate, TripController.getTripById);
router.get('/:id/timeline', authenticate, TripController.getTripTimeline);

// Update status (Assigned Driver or Admin)
router.patch(
  '/:id/status',
  authenticate,
  authorize(Role.DRIVER, Role.ADMIN),
  validateRequest(updateTripStatusValidationSchema),
  TripController.updateTripStatus,
);

// Select or auto-assign hospital (Assigned Driver or Admin)
router.patch(
  '/:id/hospital',
  authenticate,
  authorize(Role.DRIVER, Role.ADMIN),
  validateRequest(assignTripHospitalValidationSchema),
  TripController.assignHospital,
);

export const TripRoutes = router;
