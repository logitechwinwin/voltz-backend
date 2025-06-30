import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { Event } from "../event/entities/event.entity";
import { NotificationModule } from "../notification/notification.module";
// import { UserDeviceToken } from "../user/user-device-token.entity";
import { User } from "../user/user.entity";
import { VolunteerRequest } from "./entities/volunteer-request.entity";
import { VolunteerRequestController } from "./volunteer-request.controller";
import { VolunteerRequestService } from "./volunteer-request.service";
import { WalletTransactionService } from "../wallet-transaction/wallet-transaction.service";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { WalletService } from "../wallet/wallet.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      VolunteerRequest,
      Event,
      LoginAttempt,
      // UserDeviceToken,
      WalletTransaction,
    ]),
    SharedModule,
    NotificationModule,
  ],
  controllers: [VolunteerRequestController],
  providers: [VolunteerRequestService, VolunteerRequest, WalletTransactionService, WalletService],
})
export class VolunteerRequestModule {}
