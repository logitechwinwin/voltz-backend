import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost } from "@nestjs/core";
import { LoggerService } from "src/modules/logger/logger.service";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const httpStatus = this.getHttpStatus(exception);

    // Log the exception with relevant information for any other exception then 422
    if (httpStatus !== 422) {
      await this.loggerService.logException(exception, httpStatus, host);
    }

    const responseBody = this.prepareResponse(exception, httpStatus);

    console.log("🚀 ~ AllExceptionsFilter ~ responseBody:", responseBody);

    // Send the formatted error response
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private prepareResponse(exception: unknown, httpStatus: number): any {
    const errorStack = exception instanceof Error && exception.stack;

    const error = exception instanceof HttpException ? exception.name : "Error";

    const message = exception instanceof HttpException ? exception.message : "Internal server error";
    const details = exception instanceof UnprocessableEntityException ? exception.getResponse() : undefined;

    return {
      statusCode: httpStatus,
      error,
      message,
      errorStack: this.configService.get("nodeEnv") === "production" ? undefined : errorStack,
      details,
    };
  }
}
