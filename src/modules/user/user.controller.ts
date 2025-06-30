import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { FormDataRequest } from "nestjs-form-data";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { InjectUserToBody } from "src/decorators/req-injection.decorator";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { IResponse } from "src/shared/interfaces/response.interface";
import { AddDeviceTokenDto } from "./dtos/add-device-token.dto";
import { GetUsersSdgsStats } from "./dtos/get-user-sdgs-stats.dto";
import { GetVoltzHistoryStatsDto } from "./dtos/get-voltz-history-stats.dto";
import { RemoveDeviceTokenDto } from "./dtos/remove-device-token.dto";
import { SetUserInterestDto } from "./dtos/set-user-interests.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { User, UserRoles } from "./user.entity";
import { UserService } from "./user.service";
import { CurrentLoginAttempt } from "src/decorators/current-login-attempt.decorator";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("voltzHistoryStats")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async getVoltzHistoryStats(
    @CurrentUser() user: User,
    @Query() getVoltzHistoryStatsDto: GetVoltzHistoryStatsDto,
  ): Promise<IResponse> {
    return await this.userService.getVoltzHistoryStats(user, getVoltzHistoryStatsDto);
  }

  @Get("sdgsStats")
  async volunteerSdgStats(@Query() getUsersSdgsStats: GetUsersSdgsStats): Promise<IResponse> {
    const stats = await this.userService.getVolunteerSdgStats(getUsersSdgsStats);

    return {
      message: "Stats fetched successfully",
      details: stats,
    };
  }

  @Get(":id/goals-achieved")
  async goalsAchieved(@Param("id", ParseIntPipe) userId: number) {
    const goals = await this.userService.getGoalsAchieved(userId);
    return {
      message: "Achieved goals fetched successfully",
      details: goals,
    };
  }

  @Get("/profile")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async getVolunteerProfile(@CurrentUser() user: User): Promise<IResponse> {
    const { volunteer } = await this.userService.getVolunteerProfile(user);

    return {
      message: "Volunteer profile found successfully",
      details: volunteer,
    };
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  async getUser(@Param("id") userId: number, @CurrentUser() user: User): Promise<IResponse> {
    const userDetails = await this.userService.get(userId, user);
    return {
      message: "User found successfully",
      details: userDetails,
    };
  }

  @Post("set-interests")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async setUserInterests(@Body() setUserInterests: SetUserInterestDto, @CurrentUser() user: User): Promise<IResponse> {
    const updatedUser = await this.userService.setUserInterest(setUserInterests, user);
    return {
      message: "Interests added successfully",
    };
  }

  @Patch()
  @InjectUserToBody()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  @FormDataRequest()
  async updateUsers(@CurrentUser() user: User, @Body() userUpdateData: UpdateUserDto): Promise<IResponse> {
    const { savedUser } = await this.userService.updateUser(user, userUpdateData);
    return {
      message: "profile update successfully",
      details: savedUser,
    };
  }

  @Post("add-device-token")
  @UseGuards(AuthenticationGuard)
  async addDeviceToken(
    @CurrentLoginAttempt() currentLoginAttempt: LoginAttempt,
    @Body() addDeviceTokenDto: AddDeviceTokenDto,
  ): Promise<IResponse> {
    await this.userService.addDeviceToken(currentLoginAttempt, addDeviceTokenDto);
    return {
      message: "Device token saved successfully",
    };
  }
}
