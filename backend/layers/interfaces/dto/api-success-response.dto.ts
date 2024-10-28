export class ApiSuccessResponseDTO {
  public body: string;

  constructor(
    public statusCode: number = 200,
    body: Record<string, any> = { message: "Success" },
  ) {
    this.body = JSON.stringify(body);
  }
}
