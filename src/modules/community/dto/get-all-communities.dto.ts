import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { ActivationStatus } from "src/shared/enums";
import { ToBoolean } from "src/utils/booleanTransformer";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class GetAllCommunitiesDto {
  @IsString()
  @IsOptional()
  search: string;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  page: number = 1;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  perPage: number = 10;

  @IsNumber()
  @IsOptional()
  userId: number;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  myCommunities: boolean = false;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  joinedCommunities: boolean = false;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  notJoinedCommunities: boolean = false;

  @IsEnum(ActivationStatus, {
    message: enumErrorMessage("type", ActivationStatus),
  })
  @IsString()
  @IsOptional()
  activationStatus: ActivationStatus;

  constructor(partial: Partial<GetAllCommunitiesDto>) {
    Object.assign(this, partial);
  }
}
