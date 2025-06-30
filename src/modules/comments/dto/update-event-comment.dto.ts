import { PartialType } from "@nestjs/mapped-types";
import { CreateEventCommentDto } from "./create-event-comment.dto";

export class UpdateEventCommentDto extends PartialType(CreateEventCommentDto) {}
