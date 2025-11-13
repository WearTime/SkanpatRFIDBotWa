import express, { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { AttendanceController } from '../controllers/AttendanceController';

const router: Router = express.Router();

router.post(
  '/send-attendance',
  authMiddleware,
  validateRequest,
  AttendanceController.sendAttendance
);

export default router;
