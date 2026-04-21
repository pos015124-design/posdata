/**
 * Comprehensive Error Handler
 * Provides centralized error handling for the Dukani system
 */

const { logger, securityLogger } = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => 
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => 
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });

  // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    logger.error('ERROR', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  console.error('API ERROR:', err); // <--- Added for debugging

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error types for specific business logic
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, true);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, true);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, true);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, true);
    this.name = 'NotFoundError';
  }
}

class BusinessLogicError extends AppError {
  constructor(message) {
    super(message, 422, true); // Unprocessable Entity
    this.name = 'BusinessLogicError';
  }
}

// Middleware to validate request body against expected fields
const validateRequestBody = (expectedFields) => {
  return (req, res, next) => {
    if (!req.body) {
      return next(new ValidationError('Request body is required'));
    }

    // Check for unexpected fields
    const receivedFields = Object.keys(req.body);
    const unexpectedFields = receivedFields.filter(field => !expectedFields.includes(field));

    if (unexpectedFields.length > 0) {
      securityLogger.warn('Unexpected fields in request body', {
        unexpectedFields,
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      return next(new ValidationError(`Unexpected fields: ${unexpectedFields.join(', ')}`));
    }

    // Check for required fields
    const missingFields = expectedFields.filter(field => field.required && req.body[field.name] === undefined);
    if (missingFields.length > 0) {
      return next(new ValidationError(`Missing required fields: ${missingFields.map(f => f.name).join(', ')}`));
    }

    next();
  };
};

// Middleware to validate request parameters
const validateRequestParams = (expectedParams) => {
  return (req, res, next) => {
    for (const param of expectedParams) {
      if (req.params[param] === undefined) {
        return next(new ValidationError(`Missing required parameter: ${param}`));
      }
    }
    next();
  };
};

// Middleware to validate query parameters
const validateQueryParams = (allowedParams) => {
  return (req, res, next) => {
    const receivedParams = Object.keys(req.query);
    const unexpectedParams = receivedParams.filter(param => !allowedParams.includes(param));

    if (unexpectedParams.length > 0) {
      return next(new ValidationError(`Unexpected query parameters: ${unexpectedParams.join(', ')}`));
    }

    next();
  };
};

module.exports = {
  AppError,
  globalErrorHandler,
  asyncHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError,
  validateRequestBody,
  validateRequestParams,
  validateQueryParams
};