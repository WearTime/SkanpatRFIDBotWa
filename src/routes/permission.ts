import express, { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { PermissionController } from '../controllers/PermissionController';

const router: Router = express.Router();

router.post(
  '/send-permission',
  authMiddleware,
  validateRequest,
  PermissionController.sendPermission
);

router.get('/pending-confirmation', PermissionController.getPendingConfirmations);

export default router;
