import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";
import { VoltzType } from "src/modules/wallet-transaction/entities/wallet-transaction.entity";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { PaymentIntentStatus } from "src/shared/entities/payment-intent.entity";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class GetAllVoltzPurchasingDto extends GetAllDto {
  @IsEnum(PaymentIntentStatus, {
    message: enumErrorMessage("status", PaymentIntentStatus),
    each: true,
  })
  @IsArray()
  @IsOptional()
  statuses: PaymentIntentStatus[];

  @IsEnum(VoltzType, {
    message: enumErrorMessage("status", PaymentIntentStatus),
  })
  @IsOptional()
  voltzType: VoltzType;

  @IsNumber()
  @IsOptional()
  lastPurchasingId: number;
}
