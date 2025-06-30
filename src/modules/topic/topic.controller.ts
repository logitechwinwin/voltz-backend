import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TopicService } from "./topic.service";
import { CreateTopicDto } from "./dto/create-topic.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { UserRoles } from "../user/user.entity";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { UpdateTopicDto } from "./dto/update-topic.dto";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";

@Controller("topics")
export class TopicController {
  constructor(private readonly topicService: TopicService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async createTopic(@Body() createTopicData: CreateTopicDto): Promise<IResponse> {
    // ** created by is useful when we wanna show who has created this topic
    const createdTopic = await this.topicService.create(createTopicData);
    return {
      message: "Topic created successfully",
      details: createdTopic,
    };
  }

  @Get()
  // @UseGuards(AuthenticationGuard, RolesGuard)
  // @RolesDecorator(UserRoles.ADMIN, UserRoles.NGO, UserRoles.VOLUNTEER)
  async getAllTopics(@Query() getAllTopicData: GetAllDto): Promise<IResponse> {
    const { items, meta } = await this.topicService.getAll(getAllTopicData);

    return {
      message: "Topics fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async updateTopic(@Body() updateTopicData: UpdateTopicDto, @Param() paramData: ParamIdDto): Promise<IResponse> {
    const updatedTopic = await this.topicService.update(updateTopicData, paramData.id);
    return {
      message: "Topic updated successfully",
      details: updatedTopic,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async deleteTopic(@Param() paramData: ParamIdDto): Promise<IResponse> {
    const deletedTopic = await this.topicService.deleteOne(paramData.id);

    return {
      message: "Topic deleted successfully",
      details: deletedTopic,
    };
  }
}
