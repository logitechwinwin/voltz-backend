import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber, IsString, Matches, ValidateNested } from "class-validator";

export class Location {
  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "City should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "State should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "Country should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  country: string;
}
export class SetUserInterestDto {
  @IsNumber({}, { each: true, message: "topics must be an array of numbers" })
  @IsArray()
  @IsNotEmpty()
  topics: number[];

  @IsNumber({}, { each: true, message: "life stages must be an array of numbers" })
  @IsArray()
  @IsNotEmpty()
  lifeStages: number[];

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Location)
  locations: Location[];
}
