import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { WalletTransactionStatus, WalletTransactionTypes } from "../entities/wallet-transaction.entity";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  MaxDate,
  Validate,
  ValidateIf,
} from "class-validator";
import * as moment from "moment";
import { Transform } from "class-transformer";
import { enumErrorMessage } from "src/utils/enum-err-message";
import { UserRoles } from "src/modules/user/user.entity";

export class GetAllWalletTransactionDto extends GetAllDto {
  @MaxDate(
    () => {
      return moment().endOf("D").toDate();
    },
    {
      message: "From cannot be in the future",
    },
  )
  @IsDate()
  @IsOptional()
  from?: Date;

  @IsDate()
  @IsOptional()
  till?: Date;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  dealId?: number;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  campaignManagerId?: number;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  eventId?: number;

  @IsEnum(WalletTransactionTypes, {
    message: enumErrorMessage("type", WalletTransactionTypes),
  })
  @IsOptional()
  type: WalletTransactionTypes;

  @IsEnum(WalletTransactionStatus, {
    message: enumErrorMessage("status", WalletTransactionStatus),
  })
  @IsOptional()
  status: WalletTransactionStatus;

  @IsPositive()
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsEnum(UserRoles, {
    message: enumErrorMessage("status", UserRoles),
  })
  @IsNotEmpty()
  transactionsOf: UserRoles;
}
