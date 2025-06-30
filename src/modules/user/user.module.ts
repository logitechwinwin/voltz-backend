import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";
import { Donation } from "../donation/entities/donation.entity";
import { Follow } from "../follow/entities/follow.entity";
import { LifeStage } from "../life-stage/entities/life-stage.entity";
import { S3Module } from "../s3/s3.module";
import { Topic } from "../topic/entities/topic.entity";
import { VolunteerRequest } from "../volunteer-request/entities/volunteer-request.entity";
import { InterestedLocation } from "./interested-location.entity";
// import { UserDeviceToken } from "./user-device-token.entity";
import { UserController } from "./user.controller";
import { User } from "./user.entity";
import { UserService } from "./user.service";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Topic,
      LifeStage,
      InterestedLocation,
      VolunteerRequest,
      Follow,
      WalletTransaction,
      Donation,
      // UserDeviceToken,
    ]),
    SharedModule,
    S3Module,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
