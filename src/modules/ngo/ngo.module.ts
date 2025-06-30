import { Module } from "@nestjs/common";
import { NgoService } from "./ngo.service";
import { NgoController } from "./ngo.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { S3Module } from "../s3/s3.module";
import { PaymentService } from "src/shared/services/payment.service";
import { SharedModule } from "src/shared/shared.module";
import { Event } from "../event/entities/event.entity";
import { Donation } from "../donation/entities/donation.entity";
import { VolunteerRequest } from "../volunteer-request/entities/volunteer-request.entity";
import { WalletTransactionService } from "../wallet-transaction/wallet-transaction.service";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { WalletService } from "../wallet/wallet.service";
import { PaymentIntent } from "../../shared/entities/payment-intent.entity";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, LoginAttempt, PaymentIntent, Event, Donation, VolunteerRequest, WalletTransaction]),
    S3Module,
    SharedModule,
    NotificationModule,
  ],
  controllers: [NgoController],
  providers: [NgoService, PaymentService, WalletTransactionService, WalletService],
})
export class NgoModule {}
