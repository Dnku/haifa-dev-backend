/**
 * meant for production environment case, return and log error details
 * base on the error Operational status.
 * @param {*} err express error object
 * @param {*} res express response object
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted errors
  if (err.isOperational)
    res
      .status(err.statusCode)
      .send({ status: err.status, message: err.message });
  else {
    // Programing or other unknown errors: don't leek error details
    console.error(err);
    res
      .status(500)
      .send({ status: 'error', message: 'Internal server error.' });
  }
};
/**
 * meant for development environment case, return and log error details
 * base on the error Operational status.
 * @param {*} err express error object
 * @param {*} res express response object
 */
const sendErrorDev = (err, res) => {
  // log Programing or other unknown errors
  if (!err.isOperational) console.error(err);
  res.status(err.statusCode).send({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack.split('\n').map(line => line.trim())
  });
};

/**
 * Handle express errors base on origin, environment and status code.
 */
module.exports = function error(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === undefined
  )
    sendErrorDev(err, res);
  else if (process.env.NODE_ENV === 'production') sendErrorProd(err, res);
};
