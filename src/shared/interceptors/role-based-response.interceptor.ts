import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { IResponse } from "../interfaces/response.interface";
import { plainToClass } from "class-transformer";
import { UserRoles } from "src/modules/user/user.entity";

export class RoleBasedResponseSerializer implements NestInterceptor {
  constructor(private readonly dto: any) {}

  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    return next.handle().pipe(
      map((data: IResponse) => {
        const request = context.switchToHttp().getRequest();
        const userRole = request.user?.role ? request.user.role : UserRoles.VOLUNTEER;

        const serializedData = plainToClass(this.dto, data?.details, {
          groups: [userRole],
          excludeExtraneousValues: true,
        });

        const formattedResponse = {
          message: data.message,
          details: serializedData,
          extra: data.extra,
        };

        return formattedResponse;
      }),
    );
  }
}
