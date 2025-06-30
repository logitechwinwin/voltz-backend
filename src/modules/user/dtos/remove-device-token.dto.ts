import { IsNotEmpty } from "class-validator";

export class RemoveDeviceTokenDto {
  @IsNotEmpty()
  deviceToken: string;
}
