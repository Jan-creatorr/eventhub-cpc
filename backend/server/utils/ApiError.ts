// A small custom error class so controllers can throw errors with an HTTP
// status code and a friendly message that the frontend can display.
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}
