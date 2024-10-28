/**
 * ApiErrorResponseDTO is a generic class that will be used to return error messages in a standard format.
 *
 * @param message - The error message to be returned.
 * @param statusCode - The status code to be returned.
 * @param data - Any additional data to be returned.
 * @returns An object with the error message, status code and additional data.
 *
 * @example
 * return new ApiErrorResponseDTO("User already exists");
 * @example
 * return new ApiErrorResponseDTO("User already exists", 400);
 * @example
 * return new ApiErrorResponseDTO("User already exists", 400, { user: "John Doe" });
 * @example
 */
export class ApiErrorResponseDTO {
  public body: string;

  constructor(
    public statusCode: number = 400,
    body: Record<string, any> = { message: "Error" },
  ) {
    this.body = JSON.stringify(body);
  }
}
