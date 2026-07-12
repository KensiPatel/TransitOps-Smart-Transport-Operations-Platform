// ============================================
// TransitOps — standard error shapes
// Keeps every module returning errors in the same JSON shape:
//   { error: string }
// and gives a typed AppError you can throw + map to a status code.
// ============================================

export interface ErrorResponse {
  error: string;
}

/**
 * AppError — throw this from a service to carry an HTTP status alongside the
 * message. Route handlers can inspect `.status` instead of string-matching
 * messages (though the existing modules string-match, which still works).
 */
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export const NotFound = (what: string) => new AppError(`${what} not found.`, 404);
export const BadRequest = (msg: string) => new AppError(msg, 400);
export const Unauthorized = (msg = "Not authenticated") => new AppError(msg, 401);
export const Forbidden = (msg = "Forbidden: insufficient role") => new AppError(msg, 403);

/** Normalises any thrown value into { status, body } for a route handler. */
export function toErrorResponse(err: unknown): { status: number; body: ErrorResponse } {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: err.message } };
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return { status: 400, body: { error: message } };
}