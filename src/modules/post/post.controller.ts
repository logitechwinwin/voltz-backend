import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from "@nestjs/common";
import { PostService } from "./post.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { User, UserRoles } from "../user/user.entity";
import { IResponse } from "src/shared/interfaces/response.interface";
import { FormDataRequest } from "nestjs-form-data";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { GetAllPostsDto } from "./dto/get-all-posts.dto";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";

@Controller("post")
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async create(@CurrentUser() user: User, @Body() createPostDto: CreatePostDto): Promise<IResponse> {
    const post = await this.postService.create(createPostDto, user);
    return {
      message: "Post created successfully",
      details: post,
    };
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  async findAll(@CurrentUser() user: User, @Query() getAllPostDto: GetAllPostsDto): Promise<IResponse> {
    const { items, meta } = await this.postService.findAll(user, getAllPostDto);
    return {
      message: "Posts fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.postService.findOne(+id);
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async update(
    @CurrentUser() user: User,
    @Param() paramData: ParamIdDto,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<IResponse> {
    const post = await this.postService.update(paramData.id, updatePostDto, user);

    return {
      message: "Post updated successfully",
      details: post,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    const res = await this.postService.remove(id, user);

    return {
      message: "Post deleted successfully",
    };
  }

  @Post(":id/like")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async likePost(@CurrentUser() user: User, @Param() paramIdData: ParamIdDto) {
    const post = await this.postService.likePost(paramIdData.id, user);

    return {
      message: "Post liked successfully",
      details: post,
    };
  }

  @Post(":id/unlike")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async unlikePost(@CurrentUser() user: User, @Param() paramIdData: ParamIdDto) {
    const post = await this.postService.unlikePost(paramIdData.id, user);

    return {
      message: "Post unlike successfully",
      details: post,
    };
  }
}
