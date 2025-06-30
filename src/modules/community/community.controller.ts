import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from "@nestjs/common";
import { CommunityService } from "./community.service";
import { CreateCommunityDto } from "./dto/create-community.dto";
import { UpdateCommunityDto } from "./dto/update-community.dto";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { User, UserRoles } from "../user/user.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { FormDataRequest } from "nestjs-form-data";
import { IResponse } from "src/shared/interfaces/response.interface";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { GetAllCommunitiesDto } from "./dto/get-all-communities.dto";
import { ChangeActivationStatusDto } from "../event/dto/change-activation-status.dto";

@Controller("community")
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async create(@CurrentUser() user: User, @Body() createCommunityDto: CreateCommunityDto): Promise<IResponse> {
    const community = await this.communityService.create(createCommunityDto, user);
    return {
      message: "Community created successfully",
      details: community,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async update(
    @Param() paramData: ParamIdDto,
    @Body() updateCommunityDto: UpdateCommunityDto,
    @CurrentUser() user: User,
  ): Promise<IResponse> {
    const community = await this.communityService.update(paramData.id, updateCommunityDto, user);

    return {
      message: "Community updated successfully",
      details: community,
    };
  }

  @Post(":id/join")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async joinCommunity(@Param() paramData: ParamIdDto, @CurrentUser() user: User): Promise<IResponse> {
    await this.communityService.joinCommunity(paramData.id, user);

    return {
      message: "Community joined successfully",
    };
  }

  @Post(":id/unjoin")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async unjoinCommunity(@Param() paramData: ParamIdDto, @CurrentUser() user: User): Promise<IResponse> {
    await this.communityService.unjoinCommunity(paramData.id, user);

    return {
      message: "Community unjoined successfully",
    };
  }

  @Get()
  // @UseGuards(OptionalAuthGuard)
  async findAll(@Query() getAllData: GetAllCommunitiesDto): Promise<IResponse> {
    const { communities, meta } = await this.communityService.findAll(getAllData);
    return {
      message: "Communities fetched successfully",
      details: communities,
      extra: meta,
    };
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  async findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User): Promise<IResponse> {
    const community = await this.communityService.getOne(id, user);

    return {
      message: "Community fetched successfully",
      details: community,
    };
  }

  @Patch(":id/change-activation-status")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async changeActivationStatus(
    @Param("id", ParseIntPipe) communityId: number,
    @CurrentUser() user: User,
    @Body() changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    await this.communityService.changeActivationStatus(communityId, user, changeActivationStatusDto);

    return {
      message: `Community is now ${changeActivationStatusDto.status}`,
    };
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.communityService.remove(+id);
  }
}
