const express = require("express");
const {
  sendPermissionController,
  pendingConfirmationsController,
} = require("../controllers/permissionController");
const { validateRequest } = require("../middleware/validation");
const { authMiddleware } = require("../middleware/auth");
const { pendingConfirmations } = require("../utils/confirmationStore");

const router = express.Router();

router.post(
  "/send-permission",
  authMiddleware,
  validateRequest,
  sendPermissionController
);

router.get("/pending-confirmation", (req, res) => {
  const pending = Array.from(pendingConfirmations.entries()).map(
    ([phone, data]) => ({
      phone_number: phone,
      student_name: data.student_name,
      student_class: data.student_class,
      nisn: data.nisn,
      permission_type: data.permission_type,
      permission_date: data.permission_date,
      message_sent_at: data.message_sent_at,
      created_at: new Date(data.created_at).toISOString(),
    })
  );

  res.status(200).json({
    success: true,
    total: pending.length,
    pending_confirmations: pending,
  });
});
module.exports = router;
