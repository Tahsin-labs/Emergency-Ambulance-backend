import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/authorize';
import { validateRequest } from '../../middlewares/validateRequest';
import { PaymentController } from './payment.controller';
import { PaymentValidation } from './payment.validation';

const router = Router();

// Strict rate limiter for payment initiation
const paymentInitiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many payment initiation attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public callbacks from SSLCommerz (browser redirect & IPN)
router.post('/success', PaymentController.handleSuccess);
router.post('/fail', PaymentController.handleFail);
router.post('/cancel', PaymentController.handleCancel);
router.post('/ipn', PaymentController.handleIPN);

// Authenticated routes
router.use(authenticate);

// Patient initiates payment
router.post(
  '/initiate',
  paymentInitiateLimiter,
  authorize(Role.PATIENT),
  validateRequest(PaymentValidation.initiateBody),
  PaymentController.initiate,
);

// IMPORTANT: Register /my and / BEFORE /:id
router.get(
  '/my',
  authorize(Role.PATIENT),
  validateRequest(PaymentValidation.getMyPaymentsQuery),
  PaymentController.getMyPayments,
);

router.get(
  '/',
  authorize(Role.ADMIN),
  validateRequest(PaymentValidation.getPaymentsQuery),
  PaymentController.getAllPayments,
);

router.get('/:id', PaymentController.getPaymentById);

export const PaymentRoutes = router;
