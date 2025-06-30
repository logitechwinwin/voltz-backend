import { Controller, Delete, Get, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { VolunteerService } from "./volunteer.service";
import { GetAllVolunteersDto } from "./dto/get-all-volunteers.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { RoleBasedResponseSerializer } from "src/shared/interceptors/role-based-response.interceptor";
import { VolunteerDto } from "./response/volunteer.dto";
import { User, UserRoles } from "../user/user.entity";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { CurrentUser } from "src/decorators/current-user.decorator";

@Controller("volunteer")
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) {}

  @Get()
  @UseInterceptors(new RoleBasedResponseSerializer(VolunteerDto))
  async getAll(@Query() queryData: GetAllVolunteersDto): Promise<IResponse> {
    const volunteers = await this.volunteerService.getAll(queryData);
    return {
      message: "Volunteers fetched successfully",
      details: volunteers.items,
      extra: volunteers.meta,
    };
  }

  @Delete()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async deleteAccount(@CurrentUser() user: User) {
    await this.volunteerService.deleteAccount(user);
    return {
      message: "Account deleted successfully",
    };
  }
}
