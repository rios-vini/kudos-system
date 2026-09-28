/**
 * Consistent JSON error envelope (per spec section 3.6):
 * { error: { code, message } }
 */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "DUPLICATE"
  | "RATE_LIMITED"
  | "INTERNAL";

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function errorResponse(
  code: ApiErrorCode,
  status: number,
  message: string,
  headers?: Record<string, string>
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers }
  );
}

export function unauthorized(message = "You must be signed in."): Response {
  return errorResponse("UNAUTHORIZED", 401, message);
}

export function forbidden(
  message = "You do not have permission to do that."
): Response {
  return errorResponse("FORBIDDEN", 403, message);
}

export function notFound(message = "Not found."): Response {
  return errorResponse("NOT_FOUND", 404, message);
}

export function validationError(message: string): Response {
  return errorResponse("VALIDATION", 400, message);
}

export function duplicateError(message: string): Response {
  return errorResponse("DUPLICATE", 409, message);
}

export function rateLimitedError(retryAfterSeconds: number): Response {
  return errorResponse(
    "RATE_LIMITED",
    429,
    `Too many kudos submitted. Please try again in ${retryAfterSeconds} seconds.`,
    { "Retry-After": String(retryAfterSeconds) }
  );
}

export function internalError(): Response {
  return errorResponse(
    "INTERNAL",
    500,
    "Something went wrong on our end. Please try again."
  );
}
