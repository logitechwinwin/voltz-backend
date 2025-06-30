import { PartialType } from "@nestjs/mapped-types";
import { CreatePostDto } from "./create-post.dto";
import { IsBoolean, IsOptional } from "class-validator";
import { ToBoolean } from "src/utils/booleanTransformer";

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  pinned: boolean;

  @ToBoolean()
  @IsBoolean()
  @IsOptional()
  unpinned: boolean;
}
