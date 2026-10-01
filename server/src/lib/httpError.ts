/**
 * An error that maps directly onto an HTTP response.
 * `code` is a stable machine-readable identifier the frontend can switch on.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }

  static notFound(message: string) {
    return new HttpError(404, "NOT_FOUND", message);
  }
}
