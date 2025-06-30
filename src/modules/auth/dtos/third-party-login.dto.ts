import { IsNotEmpty, IsString, IsEnum, IsOptional } from "class-validator";
import { SocialType } from "src/modules/user/user.entity";
import { enumErrorMessage } from "src/utils/enum-err-message";

export class ThirdPartyLoginDto {
  @IsEnum(SocialType, {
    message: enumErrorMessage("provider", SocialType),
  })
  @IsNotEmpty()
  provider: SocialType;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsOptional()
  accessToken: string;
}
