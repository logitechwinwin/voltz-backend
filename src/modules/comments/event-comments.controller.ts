import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { User, UserRoles } from "../user/user.entity";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { FormDataRequest } from "nestjs-form-data";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CreateEventCommentDto } from "./dto/create-event-comment.dto";
import { GetAllEventCommentsDto } from "./dto/get-all-event-comments.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { UpdateEventCommentDto } from "./dto/update-event-comment.dto";
import { EventCommentsService } from "./event-comments.service";

@Controller("event-comments")
export class EventCommentsController {
  constructor(private readonly eventCommentsService: EventCommentsService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async create(@Body() createCommentDto: CreateEventCommentDto, @CurrentUser() user: User): Promise<IResponse> {
    const comment = await this.eventCommentsService.create(createCommentDto, user);

    return {
      message: "Comment created successfully",
      details: comment,
    };
  }

  @Get()
  async findAll(@Query() getAllCommentsDto: GetAllEventCommentsDto): Promise<IResponse> {
    const comments = await this.eventCommentsService.findAll(getAllCommentsDto);
    return {
      message: "Comments fetched successfully",
      details: comments.items,
      extra: comments.meta,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    const comment = await this.eventCommentsService.remove(id, user);

    return {
      message: "Comment deleted successfully",
    };
  }
}
