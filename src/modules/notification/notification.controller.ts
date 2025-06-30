import { Controller, Get, Post, Param, Delete, UseGuards, Put, Query } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { User, UserRoles } from "../user/user.entity";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { GetAllDto } from "src/shared/dtos/getAll.dto";

@Controller("notification")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(AuthenticationGuard)
  async findAll(@CurrentUser() user: User, @Query() getAllData: GetAllDto) {
    const notifications = await this.notificationService.getNotifications(user.id, getAllData);
    return {
      message: "Notifications fetch successfully",
      details: notifications,
    };
  }

  @Put(":id")
  @UseGuards(AuthenticationGuard)
  async update(@Param() notificationId: ParamIdDto) {
    const notifications = await this.notificationService.update(notificationId);
    return {
      message: "Notifications update successfully",
      details: notifications,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard)
  async delete(@Param() notificationId: ParamIdDto, @CurrentUser() user: User) {
    const notifications = await this.notificationService.deleteNotification(notificationId.id, user);
    return {
      message: "Notifications delete successfully",
    };
  }

  @Post("marks-all-as-read")
  @UseGuards(AuthenticationGuard)
  async marksAllAsRead(@CurrentUser() user: User) {
    await this.notificationService.marksAllAsRead(user);
    return {
      message: "Marks all as read successfully",
    };
  }
}
