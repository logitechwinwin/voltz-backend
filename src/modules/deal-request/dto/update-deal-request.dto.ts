import { PartialType } from "@nestjs/mapped-types";
import { CreateDealRequestDto } from "./create-deal-request.dto";
import { DealRequestStatuses } from "../entities/deal-request.entity";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateDealRequestDto {
  @IsEnum(DealRequestStatuses, {
    message: "Invalid status",
  })
  @IsNotEmpty()
  status: DealRequestStatuses;
}
