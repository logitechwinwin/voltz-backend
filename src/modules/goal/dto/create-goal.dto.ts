import { IsNotEmpty, IsNumber, ValidateIf, Min } from "class-validator";

export class CreateGoalDto {
  @ValidateIf(o => o.workingHours !== null) // Optional validation based on presence
  @IsNumber({}, { message: "Working hours must be a number." })
  @Min(1, { message: "Working hours cannot be negative." })
  @IsNotEmpty({ message: "The working hours field is required." })
  workingHours: number;
}
