import { Router } from 'express';
import { AmbulanceController } from './ambulance.controller';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { upload } from '../../middlewares/upload';
import { Role } from '@prisma/client';
import {
  createAmbulanceValidationSchema,
  updateAmbulanceValidationSchema,
  assignDriverValidationSchema,
  ambulanceQueryValidationSchema,
} from './ambulance.validation';

const router = Router();

// /available must be registered BEFORE /:id
router.get(
  '/available',
  authenticate,
  validateRequest(ambulanceQueryValidationSchema),
  AmbulanceController.getAvailableAmbulances,
);

// Admin-only list & create
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest(ambulanceQueryValidationSchema),
  AmbulanceController.getAllAmbulances,
);

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  upload.single('photo'),
  validateRequest(createAmbulanceValidationSchema),
  AmbulanceController.createAmbulance,
);

// Specific ambulance operations
router.get(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.DRIVER),
  AmbulanceController.getAmbulanceById,
);

router.patch(
  '/:id/assign-driver',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest(assignDriverValidationSchema),
  AmbulanceController.assignDriver,
);

router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  upload.single('photo'),
  validateRequest(updateAmbulanceValidationSchema),
  AmbulanceController.updateAmbulance,
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  AmbulanceController.deleteAmbulance,
);

export const AmbulanceRoutes = router;
