import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinDate,
  ValidateIf,
} from "class-validator";
import { EventType } from "../entities/event.entity";
import { enumErrorMessage } from "src/utils/enum-err-message";
import * as moment from "moment";
import { ToBoolean } from "src/utils/booleanTransformer";
import { BadRequestException } from "@nestjs/common";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { ActivationStatus } from "src/shared/enums";

export class GetAllEventsDto extends GetAllDto {
  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  byUserInterest: boolean;

  @IsString()
  @IsOptional()
  location: string;

  @IsNumber({}, { each: true, message: "sdgs must be an array of ids" })
  @Transform(({ value }) => value.map((item: string) => Number(item)))
  @IsArray()
  @IsOptional()
  sdgs: number[];

  @IsEnum(EventType, {
    message: enumErrorMessage("type", EventType),
  })
  @IsOptional()
  type: number[];

  @MinDate(moment().startOf("D").toDate(), {
    message: "date can not be in past",
  })
  @IsDate()
  @ValidateIf(o => {
    if (o.type === EventType.CAMPAIGN) {
      return true;
    } else if (o.type === EventType.CHARITY && o.date) {
      throw new BadRequestException("date not allowed if type is charity");
    }
  })
  @IsOptional()
  date: Date;

  @IsNumber()
  @IsOptional()
  userId: number;

  @IsNumber()
  @IsOptional()
  ngoId: number;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  exceedAlreadyRegistered: boolean = true;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  donatedTo: boolean = false;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  volunteeredTo: boolean = false;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  excludeExpired: boolean = false;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  upcomingOnly: boolean = false;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  onGoingOnly: boolean = false;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  expiredOnly: boolean = false; // ** the expire date has reached

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  archivedOnly: boolean = false; // ** the events which are closed

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  notArchivedOnly: boolean = false;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  excludeUpcoming: boolean = false;

  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  excludeDonationComplete: boolean = false;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  exceptEventId: number;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  campaignManagerId: number;

  @IsEnum(ActivationStatus, {
    message: enumErrorMessage("type", ActivationStatus),
  })
  @IsString()
  @IsOptional()
  activationStatus: ActivationStatus;
}
