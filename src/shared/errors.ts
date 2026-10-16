// Domain errors. Route handlers and server actions translate them into HTTP codes or messages.

/** No valid session. Route handlers answer 401. */
export class UnauthorizedError extends Error {
  override name = "UnauthorizedError";
  constructor(message = "Authentication required") {
    super(message);
  }
}
