import { Module } from "@nestjs/common";
import { FollowService } from "./follow.service";
import { FollowController } from "./follow.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { Follow } from "./entities/follow.entity";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { NotificationService } from "../notification/notification.service";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [TypeOrmModule.forFeature([User, Follow, LoginAttempt]), NotificationModule],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService, TypeOrmModule.forFeature([User, Follow, LoginAttempt])],
})
export class FollowModule {}
