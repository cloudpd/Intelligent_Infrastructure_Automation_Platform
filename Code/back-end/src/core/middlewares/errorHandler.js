function errorHandler(err, req, res, next) {
  const statusCode = err.isOperational ? err.statusCode : 500;
  const message = err.isOperational ? err.message : 'Something went wrong';

  if (!err.isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = errorHandler;