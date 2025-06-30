import { Controller, Post, Body, Patch, Param, Put, UseGuards, Get, ParseIntPipe, Query } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { ApproveUserKycDto } from "./dto/approve-user-kyc.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { CreateAdminDto } from "./dto/create-admin-data.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { RegistrationStatus, User, UserRoles } from "../user/user.entity";
import { UpdateAdminDto } from "./dto/update-admin.dto";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { FormDataRequest } from "nestjs-form-data";
import { ChangeActivationStatusDto } from "../event/dto/change-activation-status.dto";
import { GetUsersDto } from "./dto/get-users.dto";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard-stats")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async getDashboardStats(@CurrentUser() currentUser: User): Promise<IResponse> {
    const dashboardStats = await this.adminService.getDashboardStats(currentUser);
    return {
      message: "Dashboard statistics fetched successfully",
      details: dashboardStats,
    };
  }

  @Get("revenue-stats/:year")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async getRevenueStats(
    @Param("year", ParseIntPipe) year: number,
    @CurrentUser() currentUser: User,
  ): Promise<IResponse> {
    const revenueStats = await this.adminService.getRevenueStats(currentUser, year);
    return {
      message: "Revenue statistics fetched successfully",
      details: revenueStats,
    };
  }

  @Get("kyc-verifications")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async getUsers(@Query() getUsersData: GetUsersDto): Promise<IResponse> {
    const { items, meta } = await this.adminService.getUsers(getUsersData);
    return {
      message: "Users fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async create(@Body() createAdminData: CreateAdminDto): Promise<IResponse> {
    const userData = await this.adminService.createAdmin(createAdminData);
    return {
      message: "Admin created successfully",
      details: {
        userData,
      },
    };
  }

  @Patch()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  @FormDataRequest()
  async updateAdmin(@CurrentUser() user: User, @Body() updateAdminDto: UpdateAdminDto): Promise<IResponse> {
    const updatedAdmin = await this.adminService.updateAdmin(user, updateAdminDto);
    return {
      message: "Admin updated successfully",
      details: updatedAdmin,
    };
  }

  @Put("manage-user-kyc/:id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async approveUserKyc(@Param("id") userId: number, @Body() approveUserKycDto: ApproveUserKycDto): Promise<IResponse> {
    await this.adminService.approveUserKyc(userId, approveUserKycDto);
    return {
      message:
        approveUserKycDto.registrationStatus === RegistrationStatus.APPROVED
          ? "Request approved successfully, user has been notified through email"
          : "Request rejected successfully, user has been notified through email",
    };
  }

  @Patch("change-activation-status/user/:id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async changeActivationStatus(
    @Param("id", ParseIntPipe) userId: number,
    @CurrentUser() currentUser: User,
    @Body() changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    await this.adminService.changeActivationStatus(userId, currentUser, changeActivationStatusDto);

    return {
      message: `Status is now ${changeActivationStatusDto.status}`,
    };
  }
}
