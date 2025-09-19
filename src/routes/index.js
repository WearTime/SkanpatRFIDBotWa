const express = require("express");
const healthRoutes = require("./health");
const attendanceRoutes = require("./attendance");
const permissionRoutes = require("./permission");

const router = express.Router();

router.use("/", healthRoutes);

router.use("/", attendanceRoutes);

router.use("/", permissionRoutes);

module.exports = router;
