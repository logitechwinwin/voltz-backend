import { Module } from "@nestjs/common";
import { DonationService } from "./donation.service";
import { DonationController } from "./donation.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Sdg } from "../sdg/entities/sdg.entity";
import { Topic } from "../topic/entities/topic.entity";
import { LifeStage } from "../life-stage/entities/life-stage.entity";
import { User } from "../user/user.entity";
import { SharedModule } from "src/shared/shared.module";
import { Donation } from "./entities/donation.entity";
import { Event } from "../event/entities/event.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Event, Sdg, Topic, LifeStage, User, Donation]), SharedModule],
  controllers: [DonationController],
  providers: [DonationService],
})
export class DonationModule {}
