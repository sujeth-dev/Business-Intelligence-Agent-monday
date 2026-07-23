module.exports = function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || 'Something went wrong processing your request.',
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
  });
};
