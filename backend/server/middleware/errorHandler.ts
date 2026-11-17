import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

// Runs when no route matched the request.
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Central error handler. Controllers can simply throw an ApiError and this
// middleware converts it into a clean JSON response for the frontend.
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  // Malformed request bodies should be reported as a client error.
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as SyntaxError & { status?: number }).status === 400
  ) {
    res.status(400).json({ message: 'The request body must be valid JSON.' });
    return;
  }

  // MySQL errors that should become clear client responses instead of a
  // generic 500. This keeps integrity failures understandable and safe.
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'That record already exists.' });
      return;
    }

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(409).json({
        message:
          'This record is still linked to other data and cannot be deleted.',
      });
      return;
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(400).json({
        message: 'A linked record could not be found.',
      });
      return;
    }

    const unavailableCodes = new Set([
      'ECONNREFUSED',
      'PROTOCOL_CONNECTION_LOST',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ER_CON_COUNT_ERROR',
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
    ]);

    if (typeof error.code === 'string' && unavailableCodes.has(error.code)) {
      res.status(503).json({
        message: 'The database is unavailable. Please try again.',
      });
      return;
    }
  }

  console.error('Unexpected server error:', error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
};
