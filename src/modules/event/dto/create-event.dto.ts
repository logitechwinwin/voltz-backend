import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
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
import { EventType } from "../entities/event.entity";
import { enumErrorMessage } from "src/utils/enum-err-message";
import { HasExtension, HasMimeType, IsFile, MaxFileSize, MemoryStoredFile } from "nestjs-form-data";

import * as moment from "moment";
import { CompareDatesConstraint, ComparisonType } from "src/shared/validations/date-comparison.validation";
import { Transform } from "class-transformer";
import { BadRequestException } from "@nestjs/common";

export class CreateEventDto {
  @Length(2, 255, {
    message: "title must be 2 to 255 characters long",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(EventType, {
    message: enumErrorMessage("type", EventType),
  })
  @IsString()
  @IsNotEmpty()
  type: EventType;

  @IsString()
  @IsNotEmpty()
  description: string;

  @MaxFileSize(10e6) // ** 10 MB limit
  @HasExtension(["jpeg", "png", "jpg"])
  @HasMimeType(["image/jpeg", "image/png", "image/jpg"])
  @IsFile({ message: "bannerImage must only contains image" })
  @IsNotEmpty()
  bannerImage: MemoryStoredFile;

  @MinDate(moment().subtract(1, "m").toDate(), {
    message: "startDate can not be in past",
  })
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @Validate(CompareDatesConstraint, ["endDate", ComparisonType.GreaterThan, "startDate"])
  @IsDate()
  @IsNotEmpty()
  @ValidateIf(o => o.type === EventType.CAMPAIGN || (o.type === EventType.CHARITY && o.endDate))
  endDate: Date;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "Country should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CHARITY) {
      return true;
    }
  })
  country: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "State should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CHARITY) {
      return true;
    }
  })
  state: string;

  @Matches(/^[^!@#$%^&*(),.?":{}|<>]*$/, {
    message: "City should not contain special characters!",
  })
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CHARITY) {
      return true;
    }
  })
  city: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CHARITY) {
      return true;
    }
  })
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
  @IsNotEmpty()
  sdgs: number[];

  @IsInt()
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => o.type === EventType.CAMPAIGN)
  donationRequired: number;

  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN) {
      return true;
    } else if (o.type === EventType.CHARITY && o.volunteerRequired) {
      throw new BadRequestException("volunteer required not allowed if type is charity");
    }
  })
  volunteerRequired: number;

  @IsPositive()
  @IsInt()
  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN) {
      return true;
    } else if (o.type === EventType.CHARITY && o.voltzPerHour) {
      throw new BadRequestException("Voltz per hour not allowed if type is charity");
    }
  })
  voltzPerHour: number;

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
  @IsNotEmpty()
  topics: number[];

  @IsNumber({}, { each: true, message: "life stages must be an array of numbers" })
  @ArrayMinSize(1, { message: "select at least one topic" })
  @IsArray()
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsNotEmpty()
  lifeStages: number[];

  @IsPositive()
  @IsNumber()
  @IsNotEmpty({ message: "Please select a campaign manager" })
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN) {
      return true;
    } else if (o.type === EventType.CHARITY && o.campaignManagerId) {
      throw new BadRequestException("Please select a campaign manager");
    }
  })
  campaignManagerId: number;

  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN && !o.placeId) {
      return true;
    } else if (o.type === EventType.CHARITY && o.latitude) {
      throw new BadRequestException("Latitude is not allowed");
    }
  })
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN && !o.placeId) {
      return true;
    } else if (o.type === EventType.CHARITY && o.longitude) {
      throw new BadRequestException("Longitude is not allowed");
    }
  })
  longitude: number;

  @IsNumber()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN) {
      return true;
    } else if (o.type === EventType.CHARITY && o.radius) {
      throw new BadRequestException("Radius is not allowed");
    }
  })
  radius: number;

  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN && !o.longitude && !o.latitude) {
      return true;
    } else if (o.type === EventType.CHARITY && o.placeId) {
      throw new BadRequestException("Place id is not allowed");
    }
  })
  placeId: string;
}
