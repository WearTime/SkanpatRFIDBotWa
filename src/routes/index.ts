import express, { Router } from "express";
import healthRoutes from "./health";
import attendanceRoutes from "./attendance";
import permissionRoutes from "./permission";

const router: Router = express.Router();

router.use("/", healthRoutes);
router.use("/", attendanceRoutes);
router.use("/", permissionRoutes);

export default router;
