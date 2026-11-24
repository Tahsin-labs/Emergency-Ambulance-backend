import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { upload } from '../../middlewares/upload';
import { updateProfileValidationSchema } from './user.validation';

const router = Router();

// All user profile endpoints require authentication
router.get('/me', authenticate, UserController.getMyProfile);
router.patch('/me', authenticate, validateRequest(updateProfileValidationSchema), UserController.updateMyProfile);
router.post('/me/avatar', authenticate, upload.single('avatar'), UserController.updateAvatar);
router.delete('/me', authenticate, UserController.deleteMyProfile);

export const UserRoutes = router;
