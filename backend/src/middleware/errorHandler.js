function errorHandler(err, req, res, _next) {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
}

module.exports = errorHandler;
