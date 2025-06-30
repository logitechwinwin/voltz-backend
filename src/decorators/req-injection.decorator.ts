import { applyDecorators, UseInterceptors } from "@nestjs/common";
import { InjectUserInterceptor } from "src/shared/interceptors/inject-user-interceptor";

export function InjectUserToQuery() {
  return applyDecorators(InjectUserTo("query"));
}

export function InjectUserToBody() {
  return applyDecorators(InjectUserTo("body"));
}

export function InjectUserToParam() {
  return applyDecorators(InjectUserTo("params"));
}

export function InjectUserTo(context: "query" | "body" | "params") {
  return applyDecorators(UseInterceptors(new InjectUserInterceptor(context)));
}
