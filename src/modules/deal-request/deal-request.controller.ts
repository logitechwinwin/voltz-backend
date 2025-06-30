import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe, Res } from "@nestjs/common";
import { DealRequestService } from "./deal-request.service";
import { CreateDealRequestDto } from "./dto/create-deal-request.dto";
import { UpdateDealRequestDto } from "./dto/update-deal-request.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { User, UserRoles } from "../user/user.entity";
import { GetAllDealRequestDto } from "./dto/get-all-deal-request.dto";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { IResponse } from "src/shared/interfaces/response.interface";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { Response } from "express";

@Controller("deal-request")
export class DealRequestController {
  constructor(private readonly dealRequestService: DealRequestService) {}

  @Post()
  create(@Body() createDealRequestDto: CreateDealRequestDto) {
    // return this.dealRequestService.create(createDealRequestDto);
  }

  @Get()
  @UseGuards(AuthenticationGuard)
  async findAll(@Query() getAllDealRequestDto: GetAllDealRequestDto, @CurrentUser() user: User) {
    const dealRequests = await this.dealRequestService.findAll(getAllDealRequestDto, user);

    return {
      message: "Deals request fetched successfully",
      details: dealRequests.items,
      extra: dealRequests.meta,
    };
  }

  @Get("download")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  async downloadDealRequests(
    @CurrentUser() user: User,
    @Query() getAllDealRequestDto: GetAllDealRequestDto,
    @Res() res: Response,
  ) {
    await this.dealRequestService.downloadDealsRequests(getAllDealRequestDto, user, res);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.dealRequestService.findOne(+id);
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDealRequestDto: UpdateDealRequestDto,
    @CurrentUser() user: User,
  ): Promise<IResponse> {
    await this.dealRequestService.update(id, updateDealRequestDto, user);
    return {
      message: `Deal request ${updateDealRequestDto.status}`,
    };
  }
}
