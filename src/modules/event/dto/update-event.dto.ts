import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Length,
  Matches,
  MinDate,
  Validate,
  ValidateIf,
} from "class-validator";
import * as moment from "moment";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";
import { CompareDatesConstraint, ComparisonType } from "src/shared/validations/date-comparison.validation";
import { Transform } from "class-transformer";

export class UpdateEventDto {
  @Length(2, 255, {
    message: "title must be 2 to 255 characters long",
  })
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "bannerImage must only contains image" })
  @IsOptional()
  bannerImage: MemoryStoredFile;

  @MinDate(moment().subtract(1, "m").toDate(), {
    message: "startDate can not be in past",
  })
  @IsDate()
  @IsOptional()
  startDate: Date;

  @Validate(CompareDatesConstraint, ["endDate", ComparisonType.GreaterThan, "startDate"])
  @IsDate()
  @IsOptional()
  endDate: Date;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "Country should not contain special characters!",
  })
  @IsString()
  @IsOptional()
  country: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "State should not contain special characters!",
  })
  @IsString()
  @IsOptional()
  state: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "City should not contain special characters!",
  })
  @IsString()
  @IsOptional()
  city: string;

  @IsString()
  @IsOptional()
  address: string;

  @IsUrl()
  @IsString()
  @ValidateIf(o => {
    if (o.facebookUrl) {
      return true;
    }
  })
  @IsOptional()
  facebookUrl: string;

  @IsUrl()
  @IsString()
  @ValidateIf(o => {
    if (o.twitterUrl) {
      return true;
    }
  })
  @IsOptional()
  twitterUrl: string;

  @IsUrl()
  @IsString()
  @ValidateIf(o => {
    if (o.linkedinUrl) {
      return true;
    }
  })
  @IsOptional()
  linkedinUrl: string;

  @IsUrl()
  @IsString()
  @ValidateIf(o => {
    if (o.youtubeUrl) {
      return true;
    }
  })
  @IsOptional()
  youtubeUrl: string;

  @IsNumber(
    {},
    {
      each: true,
      message: "sustainable development goals must be an array of numbers",
    },
  )
  @ArrayMinSize(1, { message: "select at least one sdg" })
  @IsArray()
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsOptional()
  sdgs: number[];

  @IsOptional()
  donationRequired: number;

  @IsInt()
  @IsPositive()
  @IsNumber()
  @IsOptional()
  voltzPerHour: number;

  @IsPositive()
  @IsInt()
  @IsNumber()
  @IsOptional()
  volunteerRequired: number;

  @IsNumber(
    {},
    {
      each: true,
      message: "topics must be an array of numbers",
    },
  )
  @ArrayMinSize(1, { message: "select at least one topic" })
  @IsArray()
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsOptional()
  topics: number[];

  @IsNumber({}, { each: true, message: "life stages must be an array of numbers" })
  @ArrayMinSize(1, { message: "select at least one topic" })
  @IsArray()
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsOptional()
  lifeStages: number[];

  @IsPositive()
  @IsNumber()
  @IsOptional()
  campaignManagerId: number;

  @IsNumber()
  @IsOptional()
  latitude: number;

  @IsNumber()
  @IsOptional()
  longitude: number;

  @IsNumber()
  @IsOptional()
  radius: number;

  @IsString()
  @IsOptional()
  placeId: string;
}
