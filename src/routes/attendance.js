const express = require("express");
const {
  sendAttendanceController,
} = require("../controllers/attendanceController");
const { validateRequest } = require("../middleware/validation");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/send-attendance",
  authMiddleware,
  validateRequest,
  sendAttendanceController
);

module.exports = router;
