import { IsNotEmpty, IsOptional } from "class-validator";

export class AddDeviceTokenDto {
  @IsNotEmpty()
  deviceToken: string;
}
