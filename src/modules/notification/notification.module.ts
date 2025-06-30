import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { User } from "../user/user.entity";
import { Notification } from "./entities/notification.entity";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

@Module({
  imports: [TypeOrmModule.forFeature([Notification, LoginAttempt, User, LoginAttempt, User])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
