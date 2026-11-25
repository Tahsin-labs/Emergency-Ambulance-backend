import { Router } from 'express';
import { EmergencyRequestController } from './emergencyRequest.controller';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { upload } from '../../middlewares/upload';
import { Role } from '@prisma/client';
import {
  createEmergencyRequestValidationSchema,
  cancelEmergencyRequestValidationSchema,
  overridePriorityValidationSchema,
  manualDispatchValidationSchema,
  emergencyRequestQueryValidationSchema,
} from './emergencyRequest.validation';

const router = Router();

// Patient creates an emergency request
router.post(
  '/',
  authenticate,
  authorize(Role.PATIENT),
  upload.single('photo'),
  validateRequest(createEmergencyRequestValidationSchema),
  EmergencyRequestController.createRequest,
);

// Admin lists all requests
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest(emergencyRequestQueryValidationSchema),
  EmergencyRequestController.getAllRequests,
);

// Patient lists own requests
router.get(
  '/my',
  authenticate,
  authorize(Role.PATIENT),
  EmergencyRequestController.getMyRequests,
);

// Single request detail (Patient owner, Driver assigned, or Admin)
router.get('/:id', authenticate, EmergencyRequestController.getRequestById);

// Admin priority override
router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest(overridePriorityValidationSchema),
  EmergencyRequestController.overridePriority,
);

// Patient or Admin cancels request
router.post(
  '/:id/cancel',
  authenticate,
  authorize(Role.PATIENT, Role.ADMIN),
  validateRequest(cancelEmergencyRequestValidationSchema),
  EmergencyRequestController.cancelRequest,
);

// Admin manual dispatch / reassign
router.post(
  '/:id/dispatch',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest(manualDispatchValidationSchema),
  EmergencyRequestController.manualDispatchOrReassign,
);

export const EmergencyRequestRoutes = router;
