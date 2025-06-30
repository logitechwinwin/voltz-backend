import { IsNotEmpty, IsNumber, IsOptional, ValidateIf } from "class-validator";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

export class getAllMessagesDto extends GetAllDto {
  @IsNumber()
  @IsNotEmpty()
  chatId: number;

  @ValidateIf(o => !o.chatId) // If chatId is not provided, recipientId must be present
  @IsNumber()
  @IsNotEmpty()
  recipientId?: number;

  @IsNumber()
  @IsOptional()
  lastMessageId?: number;

  @IsNumber()
  @IsOptional()
  limit: 10;
}
