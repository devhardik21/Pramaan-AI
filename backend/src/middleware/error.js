/**
 * Global error handler — must be registered last in Express.
 */
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;

  // Don't leak stack traces in production
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'An internal server error occurred'
      : err.message || 'An error occurred';

  if (status === 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * 404 handler — for unmatched routes.
 */
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
