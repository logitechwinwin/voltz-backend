import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { LoggerService } from "src/modules/logger/logger.service";
import { performance } from "perf_hooks";
import { IResponse } from "../interfaces/response.interface";

@Injectable()
export class AllResponseInterceptor implements NestInterceptor {
  constructor(private readonly loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const start = performance.now(); // Start timer for duration

    return next.handle().pipe(
      map(async (data: IResponse) => {
        const duration = (performance.now() - start).toFixed(2); // Time in ms
        const httpStatus = context.switchToHttp().getResponse()?.statusCode || 200;

        // Log the successful response
        await this.loggerService.logResponseDetails(request, duration, data, httpStatus);

        // Format and return the response
        const formattedResponse = {
          status: httpStatus,
          message: data?.message || "Success",
          response:
            data?.details || data?.extra
              ? {
                  details: data?.details || undefined,
                  ...(data.extra && data.extra),
                }
              : undefined,
        };

        return formattedResponse;
      }),
    );
  }
}
