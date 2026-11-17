import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Wraps async route handlers so thrown errors are passed to Express's
// error middleware automatically (no try/catch in every controller).
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
