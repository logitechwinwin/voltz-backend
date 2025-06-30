import { User } from "src/modules/user/user.entity";
import { REQUEST_CONTEXT } from "../interceptors/inject-user-interceptor";
import { ValidationArguments } from "class-validator";

export interface ExtendedValidationArguments extends ValidationArguments {
  object: {
    [REQUEST_CONTEXT]: {
      user: User;
    };
  };
}
