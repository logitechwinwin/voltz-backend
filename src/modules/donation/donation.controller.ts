import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, ParseIntPipe, Query } from "@nestjs/common";
import { DonationService } from "./donation.service";
import { CreateDonationDto } from "./dto/create-donation.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { Request, request } from "express";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { User, UserRoles } from "../user/user.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { GetAllDonationDto } from "./dto/get-all-donation.dto";

@Controller("donation")
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async create(
    @CurrentUser() user: User,
    @Body() createDonationDto: CreateDonationDto,
    @Req() req: Request,
  ): Promise<IResponse> {
    const response = await this.donationService.create(user, createDonationDto, req);
    return {
      message: "Donation created successfully",
      details: {
        formUrl: response,
      },
    };
  }

  @Patch("verify/:userId")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async verifyDonation(
    @CurrentUser() user: User,
    @Param("userId", ParseIntPipe) userId: number,
    @Query("token-id") tokenId: string,
  ) {
    const response = await this.donationService.verify(user, tokenId, userId);

    return {
      message: "Thanks for your donation",
    };
  }

  @Get()
  async findAll(@Query() queryData: GetAllDonationDto): Promise<IResponse> {
    const donations = await this.donationService.findAll(queryData);
    return {
      message: "Donations fetched successfully",
      details: donations,
    };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.donationService.findOne(+id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.donationService.remove(+id);
  }
}
