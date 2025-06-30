import { IsNotEmpty, IsNumber } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class GetChatByRecipientIdDto extends GetAllDto {
  @IsNumber()
  @IsNotEmpty()
  recipientId: number;
}
