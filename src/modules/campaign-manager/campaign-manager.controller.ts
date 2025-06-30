import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from "@nestjs/common";
import { CampaignManagerService } from "./campaign-manager.service";
import { CreateCampaignManagerDto } from "./dto/create-campaign-manager.dto";
import { UpdateCampaignManagerDto } from "./dto/update-campaign-manager.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { User, UserRoles } from "../user/user.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { FormDataRequest } from "nestjs-form-data";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { InjectUserToBody } from "src/decorators/req-injection.decorator";
import { GetAllCampaignManagersDto } from "./dto/get-all-campaign-managers.dto";

@Controller("campaign-manager")
export class CampaignManagerController {
  constructor(private readonly campaignManagerService: CampaignManagerService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  @FormDataRequest()
  async create(
    @Body() createCampaignManagerDto: CreateCampaignManagerDto,
    @CurrentUser() currentUser: User,
  ): Promise<IResponse> {
    await this.campaignManagerService.create(createCampaignManagerDto, currentUser);
    return {
      message: "Campaign manager created successfully",
    };
  }

  @Get()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.ADMIN)
  async findAll(@Query() getAllCampaignManagersDto: GetAllCampaignManagersDto, @CurrentUser() currentUser: User) {
    
    const { items, meta } = await this.campaignManagerService.findAll(getAllCampaignManagersDto, currentUser);

    return {
      message: "Campaign managers fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Get(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  async findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() currentUser: User): Promise<IResponse> {
    const campaignManager = await this.campaignManagerService.findOne(id, currentUser);

    return {
      message: "Campaign manager fetched successfully",
      details: campaignManager,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.CAMPAIGN_MANAGER)
  @FormDataRequest()
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCampaignManagerDto: UpdateCampaignManagerDto,
    @CurrentUser() currentUser: User,
  ): Promise<IResponse> {
    const updatedCampaignManager = await this.campaignManagerService.update(id, updateCampaignManagerDto, currentUser);

    return {
      message:
        currentUser.role === UserRoles.CAMPAIGN_MANAGER
          ? `Profile updated successfully`
          : "Campaign manager updated successfully",
      details: updatedCampaignManager,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User): Promise<IResponse> {
    const campaignManager = await this.campaignManagerService.remove(id, user);

    return {
      message: "Campaign manager removed successfully",
    };
  }
}
