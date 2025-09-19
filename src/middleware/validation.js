const validateRequest = (req, res, next) => {
  const { data, timestamp } = req.body;

  if (!data || typeof data !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid data format",
    });
  }

  if (!timestamp || typeof timestamp !== "number") {
    return res.status(400).json({
      success: false,
      message: "Invalid timestamp format",
    });
  }

  next();
};

module.exports = {
  validateRequest,
};
