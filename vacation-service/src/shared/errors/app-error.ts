/**
 * Base class for all application-level HTTP errors.
 * Subclass it to create domain-specific errors with a fixed status code and
 * error code that the error-handler middleware serialises into the response.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
