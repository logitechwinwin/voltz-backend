import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetAllCampaignManagersDto extends GetAllDto {
  @IsPositive()
  @IsNumber()
  @IsNotEmpty()
  ngoId: number;
}
