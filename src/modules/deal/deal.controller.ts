import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Res, ParseIntPipe } from "@nestjs/common";
import { DealService } from "./deal.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { User, UserRoles } from "../user/user.entity";
import { FormDataRequest } from "nestjs-form-data";
import { IResponse } from "src/shared/interfaces/response.interface";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { GetAllDtoDeals } from "./dto/get-all.dto";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { AvailDealDto } from "./dto/avail-deal.dto";
import { DealsAnalyticsDto } from "./dto/deals-analytics.dto";
import { GetDealsReportDto } from "./dto/get-deals-report.dto";
import { Response } from "express";
import { ChangeActivationStatusDto } from "../event/dto/change-activation-status.dto";

@Controller("deal")
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  @FormDataRequest()
  async create(@Body() createDealDto: CreateDealDto, @CurrentUser() user: User): Promise<IResponse> {
    const deal = await this.dealService.create(createDealDto, user);
    return {
      message: "Deal created successfully",
      details: deal,
    };
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  async findAll(@Query() queryData: GetAllDtoDeals): Promise<IResponse> {
    const deals = await this.dealService.findAll(queryData);
    return {
      message: `${queryData.savedDeals ? "Saved Deals" : "Deals"} fetched successfully`,
      details: deals,
    };
  }

  @Get("analytics")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  async getDealsAnalytics(@CurrentUser() user: User, @Query() getEventAnalyticsDto: DealsAnalyticsDto) {
    const analytics = await this.dealService.getDealsAnalytics(getEventAnalyticsDto, user);

    return {
      message: "Events analytics fetched successfully",
      details: analytics,
    };
  }

  @Get("reports")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  async getDealsReport(@CurrentUser() user: User, @Query() getDealsReportDto: GetDealsReportDto) {
    const reports = await this.dealService.getDealsReport(getDealsReportDto, user);
    return {
      message: "Deals reports fetched successfully",
      details: reports.items,
      extra: reports.meta,
    };
  }

  @Get("reports/download")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  async downloadDealsReport(
    @CurrentUser() user: User,
    @Query() getDealsReportDto: GetDealsReportDto,
    @Res() res: Response,
  ) {
    await this.dealService.downloadDealsReport(getDealsReportDto, user, res);
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  async findOne(@CurrentUser() user: User, @Param() paramData: ParamIdDto): Promise<IResponse> {
    const deal = await this.dealService.findOne(paramData.id, user);
    return {
      message: "Deal fetched successfully",
      details: deal,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async update(
    @CurrentUser() user: User,
    @Body() updateDealDto: UpdateDealDto,
    @Param() paramData: ParamIdDto,
  ): Promise<IResponse> {
    const updatedDeal = await this.dealService.update(paramData.id, updateDealDto, user);

    return {
      message: "Deal updated successfully",
      details: updatedDeal,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY, UserRoles.VOLUNTEER)
  async delete(@Param() paramData: ParamIdDto): Promise<IResponse> {
    await this.dealService.delete(paramData.id);
    return {
      message: "Deal deleted successfully",
    };
  }

  @Post("save/:id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY, UserRoles.VOLUNTEER)
  async saveDeal(@CurrentUser() user: User, @Param() paramData: ParamIdDto): Promise<IResponse> {
    const savedDeal = await this.dealService.saveDeal(user, paramData.id);
    return savedDeal;
  }

  @Post("avail")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async availDeal(@CurrentUser() user: User, @Body() availDealDto: AvailDealDto): Promise<IResponse> {
    const availDeal = await this.dealService.availDeal(user, availDealDto);

    return {
      message: "Your request has been sent to the company",
      details: availDeal,
    };
  }

  @Patch(":id/change-activation-status")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async changeActivationStatus(
    @Param("id", ParseIntPipe) dealId: number,
    @CurrentUser() user: User,
    @Body() changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    await this.dealService.changeActivationStatus(dealId, user, changeActivationStatusDto);

    return {
      message: `Deal is now ${changeActivationStatusDto.status}`,
    };
  }
}
