import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsPositive } from "class-validator";
import { ToBoolean } from "src/utils/booleanTransformer";

export class GetRandomUsersStoriesDto {
  @IsBoolean()
  @ToBoolean()
  @Type(() => Boolean)
  @IsOptional()
  onlyMyStories: boolean = false;
}
