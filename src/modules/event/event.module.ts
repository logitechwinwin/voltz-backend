import { Module } from "@nestjs/common";
import { EventService } from "./event.service";
import { EventController } from "./event.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Event } from "./entities/event.entity";
import { SharedModule } from "src/shared/shared.module";
import { Sdg } from "../sdg/entities/sdg.entity";
import { Topic } from "../topic/entities/topic.entity";
import { LifeStage } from "../life-stage/entities/life-stage.entity";
import { User } from "../user/user.entity";
import { Donation } from "../donation/entities/donation.entity";
import { S3Module } from "../s3/s3.module";
import { VolunteerRequest } from "../volunteer-request/entities/volunteer-request.entity";
import { Follow } from "../follow/entities/follow.entity";
import { FollowModule } from "../follow/follow.module";
import { NotificationModule } from "../notification/notification.module";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Sdg,
      Topic,
      LifeStage,
      User,
      VolunteerRequest,
      Follow,
      Donation,
      ActivationChangeLog,
      VolunteerRequest,
    ]),
    SharedModule,
    S3Module,
    FollowModule,
    NotificationModule,
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
