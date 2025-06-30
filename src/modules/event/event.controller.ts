import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, ParseIntPipe } from "@nestjs/common";
import { EventService } from "./event.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { User, UserRoles } from "../user/user.entity";
import { FormDataRequest } from "nestjs-form-data";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { GetAllEventsDto } from "./dto/get-all.dto";
import { RegisterForEventDto } from "./entities/register-for-event.dto";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { GetEventStatsDto } from "./dto/get-event-stats.dto";
import { GetVolunteerRegisteredDto } from "./dto/get-volunteer-registered.dto";
import { ChangeActivationStatusDto } from "./dto/change-activation-status.dto";

@Controller("events")
export class EventController {
  constructor(private readonly eventService: EventService) { console.log("EventController class is constructed.")}
 
  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  @FormDataRequest()
  async create(@Body() createEventData: CreateEventDto, @CurrentUser() user: User): Promise<IResponse> {
    console.log("Creating event for user");
    try { 
    const event = await this.eventService.create(createEventData, user);
    console.log("event content log:::", event);
    return {
      message: "Event created successfully",
      details: event,
    };
    } catch(error) {
      console.log("Error creating event:", error);
    }
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  @FormDataRequest()
  async update(
    @CurrentUser() user: User,
    @Body() updateEventData: UpdateEventDto,
    @Param() paramData: ParamIdDto,
  ): Promise<IResponse> {
    const updatedEvent = await this.eventService.update(paramData.id, updateEventData, user);

    return {
      message: "Event updated successfully",
      details: updatedEvent,
    };
  }

  @Post("toggle-event-archive/:id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  async toggleArchive(@CurrentUser() user: User, @Param() paramData: ParamIdDto) {
    const event = await this.eventService.toggleArchive(paramData.id, user);

    return {
      message: event.closed ? "Event archived successfully" : "Event un-archived successfully",
    };
  }

  @Post("register")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER, UserRoles.ADMIN)
  async registerForEvent(@CurrentUser() user: User, @Body() registerForEventDto: RegisterForEventDto) {
    await this.eventService.registerForEvent(user, registerForEventDto);

    return {
      message: "Event registered successfully",
    };
  }

  @Post("un-register")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER, UserRoles.ADMIN)
  async unregisterFromEvent(@CurrentUser() user: User, @Body() registerForEventDto: RegisterForEventDto) {
    await this.eventService.unregisterFromEvent(user, registerForEventDto);

    return {
      message: "Event un-registered successfully",
    };
  }

  @Get()
  async getAll(@Query() queryData: GetAllEventsDto): Promise<IResponse> {
    const events = await this.eventService.getAll(queryData);
    return {
      message: "Events fetched successfully",
      details: events,
    };
  }

  @Get(":id/stats")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.CAMPAIGN_MANAGER, UserRoles.NGO, UserRoles.ADMIN)
  async getEventStats(@Param("id", ParseIntPipe) eventId: number, @Query() getEventStats: GetEventStatsDto) {
    const stats = await this.eventService.getEventStats(getEventStats, eventId);
    return {
      message: "Event statistics fetched successfully",
      details: stats,
    };
  }

  @Get(":id/registered-volunteer")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.CAMPAIGN_MANAGER, UserRoles.NGO, UserRoles.ADMIN)
  async getEventVolunteer(
    @Param("id", ParseIntPipe) eventId: number,
    @Query() getVolunteerRegisteredDto: GetVolunteerRegisteredDto,
  ) {
    const res = await this.eventService.getVolunteerRegistered(getVolunteerRegisteredDto, eventId);
    return {
      message: "Registered volunteer fetched successfully",
      details: res.items,
      extra: res.meta,
    };
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  async get(@Param("id") eventId: number, @CurrentUser() user: User): Promise<IResponse> {
    const event = await this.eventService.get(eventId, user?.id);
    return {
      message: "Event fetched successfully",
      details: event,
    };
  }

  @Patch(":id/change-activation-status")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async changeActivationStatus(
    @Param("id", ParseIntPipe) eventId: number,
    @CurrentUser() user: User,
    @Body() changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    await this.eventService.changeActivationStatus(eventId, user, changeActivationStatusDto);

    return {
      message: `Event is now ${changeActivationStatusDto.status}`,
    };
  }
}
