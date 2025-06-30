import { Controller, Post, Delete, Param, Get, UseGuards, Put, Query } from "@nestjs/common";
import { FollowService } from "./follow.service";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { User, UserRoles } from "../user/user.entity";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { IResponse } from "src/shared/interfaces/response.interface";
import { GetAllDto } from "./entities/get-all.dto";

@Controller("follow")
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(":followeeId")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async followUser(@CurrentUser() user: User, @Param("followeeId") followeeId: number): Promise<IResponse> {
    await this.followService.followUser(user, followeeId);
    return {
      message: "Followed successfully",
    };
  }

  @Delete(":followeeId")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async unFollowUser(@CurrentUser() user: User, @Param("followeeId") followeeId: number): Promise<IResponse> {
    await this.followService.unFollowUser(user, followeeId);
    return {
      message: "Unfollowed successfully",
    };
  }

  @Get("followers/:userId")
  async getFollowers(@Param("userId") userId: number, @Query() queryData: GetAllDto) {
    const data = await this.followService.getFollowers(userId, queryData);
    return {
      message: "Followers get successfully",
      details: data,
    };
  }

  @Get("following/:userId")
  async getFollowing(@Param("userId") userId: number, @Query() queryData: GetAllDto) {
    const data = await this.followService.getFollowing(userId, queryData);
    return {
      message: "Followers get successfully",
      details: data,
    };
  }
}
