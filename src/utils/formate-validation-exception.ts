import { UnprocessableEntityException, ValidationError } from "@nestjs/common";
import { formatErrorMessage } from "./formate-error-message";

// Recursive function to extract and format errors
const extractErrors = (errors: ValidationError[]): any => {
  const formattedErrors = {};

  errors.forEach((error: ValidationError) => {
    if (error.children && error.children.length) {
      formattedErrors[error.property] = extractErrors(error.children);
    } else {
      const eMessage = Object.values(error.constraints)[0];
      formattedErrors[error.property] = formatErrorMessage(eMessage);
    }
  });

  return formattedErrors;
};

export const formateValidationException = (errors: ValidationError[]) => {
  const formattedErrors = extractErrors(errors);
  return new ValidationException(formattedErrors);
};

// shared/exceptions/validation.exception.ts
export class ValidationException extends UnprocessableEntityException {
  constructor(public validationErrors: Record<string, unknown>) {
    super(validationErrors);
  }
}
