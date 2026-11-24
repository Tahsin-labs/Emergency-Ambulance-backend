import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { upload } from '../../middlewares/upload';
import { authRateLimiter } from '../../middlewares/rateLimiter';
import { Role } from '@prisma/client';
import {
  registerValidationSchema,
  loginValidationSchema,
  googleAuthValidationSchema,
  refreshTokenValidationSchema,
  changePasswordValidationSchema,
  registerDriverValidationSchema,
} from './auth.validation';

const router = Router();

// Public auth endpoints with stricter rate limiting
router.post(
  '/register',
  authRateLimiter,
  validateRequest(registerValidationSchema),
  AuthController.register,
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest(loginValidationSchema),
  AuthController.login,
);

router.post(
  '/google',
  authRateLimiter,
  validateRequest(googleAuthValidationSchema),
  AuthController.googleLogin,
);

router.post(
  '/refresh-token',
  authRateLimiter,
  validateRequest(refreshTokenValidationSchema),
  AuthController.refreshToken,
);

// Authenticated auth endpoints
router.post('/logout', authenticate, AuthController.logout);

router.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordValidationSchema),
  AuthController.changePassword,
);

// Admin-only driver registration with optional license file upload
router.post(
  '/register-driver',
  authenticate,
  authorize(Role.ADMIN),
  upload.single('licenseImage'),
  validateRequest(registerDriverValidationSchema),
  AuthController.registerDriver,
);

export const AuthRoutes = router;
