import { Module } from "@nestjs/common";
import { CommunityService } from "./community.service";
import { CommunityController } from "./community.controller";
import { SharedModule } from "src/shared/shared.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Community } from "./entities/community.entity";
import { S3Module } from "../s3/s3.module";
import { NotificationModule } from "../notification/notification.module";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Community, ActivationChangeLog]), SharedModule, S3Module, NotificationModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
