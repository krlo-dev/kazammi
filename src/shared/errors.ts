// Domain errors. Route handlers and server actions translate them into HTTP codes or messages.

/** No valid session. Route handlers answer 401. */
export class UnauthorizedError extends Error {
  override name = "UnauthorizedError";
  constructor(message = "Authentication required") {
    super(message);
  }
}

/**
 * The resource does not exist or belongs to another user. Both cases look the same on
 * purpose, so a user cannot probe for other users' data (LIB-R14).
 */
export class NotFoundError extends Error {
  override name = "NotFoundError";
  constructor(message = "Not found") {
    super(message);
  }
}

/** Input that breaks a domain rule. `message` is shown to the user (Spanish). */
export class ValidationError extends Error {
  override name = "ValidationError";
}

/** A per-user quota was reached (LIB-R16). `message` is shown to the user (Spanish). */
export class LimitError extends Error {
  override name = "LimitError";
}
