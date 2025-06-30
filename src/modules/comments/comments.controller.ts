import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { User, UserRoles } from "../user/user.entity";
import { FormDataRequest } from "nestjs-form-data";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { GetAllCommentsDto } from "./dto/get-all-comments.dto";

@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async create(@Body() createCommentDto: CreateCommentDto, @CurrentUser() user: User): Promise<IResponse> {
    const comment = await this.commentsService.create(createCommentDto, user);

    return {
      message: "Comment created successfully",
      details: comment,
    };
  }

  @Get()
  async findAll(@Query() getAllCommentsDto: GetAllCommentsDto): Promise<IResponse> {
    const comments = await this.commentsService.findAll(getAllCommentsDto);
    return {
      message: "Comments fetched successfully",
      details: comments.items,
      extra: comments.meta,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.commentsService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentsService.update(+id, updateCommentDto);
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    const comment = await this.commentsService.remove(id, user);

    return {
      message: "Comment deleted successfully",
    };
  }
}
