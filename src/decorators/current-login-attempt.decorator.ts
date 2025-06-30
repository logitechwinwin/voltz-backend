import { ExecutionContext, createParamDecorator } from "@nestjs/common";

export const CurrentLoginAttempt = createParamDecorator((data: never, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.loginAttempt ?? null;
});
