import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from "@nestjs/common";
import { StoryService } from "./story.service";
import { CreateStoryDto } from "./dto/create-story.dto";
import { UpdateStoryDto } from "./dto/update-story.dto";
import { FormDataRequest } from "nestjs-form-data";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { User, UserRoles } from "../user/user.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { IResponse } from "src/shared/interfaces/response.interface";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { GetRandomUsersStoriesDto } from "./dto/get-random-users-stories.dto";

@Controller("story")
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  @FormDataRequest()
  async create(@Body() createStoryDto: CreateStoryDto, @CurrentUser() user: User): Promise<IResponse> {
    const story = await this.storyService.create(createStoryDto, user);

    return {
      message: "Story uploaded successfully",
      details: story,
    };
  }

  @Patch(":id/toggle-like")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async toggleLikeOnStory(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User): Promise<IResponse> {
    await this.storyService.toggleLike(id, user);
    return {
      message: "ok",
    };
  }

  @Patch(":id/seen")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async storySeen(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User): Promise<IResponse> {
    await this.storyService.markSeen(id, user);
    return {
      message: "Marked seen",
    };
  }

  @Patch(":id/shared")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async storyShared(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User): Promise<IResponse> {
    await this.storyService.shared(id, user);
    return {
      message: "Marked seen",
    };
  }

  @Get()
  @UseGuards(AuthenticationGuard)
  async findAll(@CurrentUser() user: User, @Query() getRandomUsersStories: GetRandomUsersStoriesDto) {
    const stories = await this.storyService.findAll(getRandomUsersStories, user);
    return {
      message: "Stories fetched successfully",
      details: stories,
    };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.storyService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateStoryDto: UpdateStoryDto) {
    return this.storyService.update(+id, updateStoryDto);
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User): Promise<IResponse> {
    await this.storyService.remove(id, user);

    return {
      message: "Story deleted successfully",
    };
  }
}
