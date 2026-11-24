import { Router } from 'express';
import { HospitalController } from './hospital.controller';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { upload } from '../../middlewares/upload';
import { Role } from '@prisma/client';
import {
  createHospitalValidationSchema,
  updateHospitalValidationSchema,
  hospitalQueryValidationSchema,
  nearbyHospitalQueryValidationSchema,
} from './hospital.validation';

const router = Router();

// /nearby must be registered BEFORE /:id
router.get(
  '/nearby',
  authenticate,
  validateRequest(nearbyHospitalQueryValidationSchema),
  HospitalController.getNearbyHospitals,
);

// Any authenticated user can list hospitals
router.get(
  '/',
  authenticate,
  validateRequest(hospitalQueryValidationSchema),
  HospitalController.getAllHospitals,
);

// Any authenticated user can retrieve a single hospital
router.get('/:id', authenticate, HospitalController.getHospitalById);

// Admin-only creation
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  upload.single('image'),
  validateRequest(createHospitalValidationSchema),
  HospitalController.createHospital,
);

// Admin-only update
router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  upload.single('image'),
  validateRequest(updateHospitalValidationSchema),
  HospitalController.updateHospital,
);

// Admin-only delete
router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  HospitalController.deleteHospital,
);

export const HospitalRoutes = router;
