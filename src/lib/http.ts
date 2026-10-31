import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Parse an integer route parameter (all ids are integers). */
export function parseId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'Invalid id — expected a positive integer.');
  }
  return id;
}

export function getUserId(req: Request): string {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required.');
  }
  return req.user.id;
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found.' });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      error: 'Validation failed.',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  console.error('[unhandled]', error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
}
