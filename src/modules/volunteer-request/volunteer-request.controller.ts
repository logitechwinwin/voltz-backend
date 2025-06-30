import { Controller, Post, Body, Param, Patch, Get, UseGuards, Query, ParseIntPipe } from "@nestjs/common";
import { VolunteerRequestService } from "./volunteer-request.service";
import { VolunteerRequest, VolunteerRequestStatus } from "./entities/volunteer-request.entity";
import { CreateVolunteerRequestDto } from "./dto/create-volunteer-request.dto";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { User, UserRoles } from "../user/user.entity";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { IResponse } from "src/shared/interfaces/response.interface";
import { UpdateVolunteerRequestStatusDto } from "./dto/update-volunteer-request-status.dto";
import { GetAllVolunteerRequestDto } from "./dto/get-all-volunteer-requests.dto";
import { CheckInDto } from "./dto/check-in.dto";
import { CheckOutDto } from "./dto/check-out.dto";

@Controller("volunteer-requests")
export class VolunteerRequestController {
  constructor(private readonly volunteerRequestService: VolunteerRequestService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async createVolunteerRequest(
    @CurrentUser() user: User,
    @Body() createVolunteerRequestData: CreateVolunteerRequestDto,
  ): Promise<IResponse> {
    await this.volunteerRequestService.createRequest(user, createVolunteerRequestData);
    return {
      message: "Volunteer request send successfully",
    };
  }

  @Post("check-in")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async checkIn(@CurrentUser() user: User, @Body() checkInDto: CheckInDto): Promise<IResponse> {
    const checkIn = await this.volunteerRequestService.checkIn(user, checkInDto);
    return {
      message: "Check-in marked successfully",
      details: checkIn,
    };
  }

  @Post("check-out")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async checkOut(@CurrentUser() user: User, @Body() checkOutDto: CheckOutDto): Promise<IResponse> {
    const checkOut = await this.volunteerRequestService.checkOut(user, checkOutDto);
    return {
      message: "Check-out marked successfully",
      details: checkOut,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.CAMPAIGN_MANAGER)
  async updateVolunteerRequestStatus(
    @CurrentUser() user: User,
    @Param("id") id: number,
    @Body() updateVolunteerRequestData: UpdateVolunteerRequestStatusDto,
  ) {
    await this.volunteerRequestService.updateRequestStatus(user, id, updateVolunteerRequestData);

    return {
      message: `Volunteers request ${updateVolunteerRequestData.status} successfully`,
    };
  }

  @Get(":id/status")
  @UseGuards(AuthenticationGuard)
  async getVolunteerRequestStatus(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    const volunteerRequest: VolunteerRequest = await this.volunteerRequestService.findByIdAndUser(id, user);

    const details = {
      checkIn: !!volunteerRequest.checkInAt,
      checkInAt: volunteerRequest.checkInAt,
      checkOutAt: volunteerRequest.checkOutAt || null,
      volunteerRequestId: volunteerRequest.id,
    };

    return {
      response: {
        details,
      },
    };
  }

  @Get()
  @UseGuards(AuthenticationGuard)
  async getRequestsByEvent(
    @Query() getAllVolunteerRequestDto: GetAllVolunteerRequestDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.volunteerRequestService.getRequestsByEvent(getAllVolunteerRequestDto, user);
    return {
      response: {
        details: data.items,
      },
    };
  }
}
