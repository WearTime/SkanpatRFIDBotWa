import express, { Router } from 'express';
import healthRoutes from './health';
import attendanceRoutes from './attendance';
import permissionRoutes from './permission';
import queueRoutes from './queue';

const router: Router = express.Router();

router.use('/', healthRoutes);
router.use('/', attendanceRoutes);
router.use('/', permissionRoutes);
router.use('/', queueRoutes);

export default router;
