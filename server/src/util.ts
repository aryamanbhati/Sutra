import type { Request, Response, NextFunction } from 'express';

/**
 * Wrap an async route so a rejected promise is forwarded to Express's error
 * middleware instead of crashing the process (Express 4 doesn't catch async throws).
 * `req` is typed loosely so handlers using AuthedRequest still fit.
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
