import { Router, Request, Response } from 'express';
import { sendResponse } from '../utils/sendResponse';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRoutes } from '../modules/user/user.routes';
import { AmbulanceRoutes } from '../modules/ambulance/ambulance.routes';
import { DriverRoutes } from '../modules/driver/driver.routes';
import { HospitalRoutes } from '../modules/hospital/hospital.routes';
import { EmergencyRequestRoutes } from '../modules/emergencyRequest/emergencyRequest.routes';
import { TripRoutes } from '../modules/trip/trip.routes';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { AdminRoutes } from '../modules/admin/admin.routes';

const router = Router();

// Module routes
router.use('/auth', AuthRoutes);
router.use('/users', UserRoutes);
router.use('/ambulances', AmbulanceRoutes);
router.use('/drivers', DriverRoutes);
router.use('/hospitals', HospitalRoutes);
router.use('/emergency-requests', EmergencyRequestRoutes);
router.use('/trips', TripRoutes);
router.use('/notifications', NotificationRoutes);
router.use('/admin', AdminRoutes);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Emergency Ambulance Dispatch API is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
