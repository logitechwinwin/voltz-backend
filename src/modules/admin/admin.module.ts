import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { MailsModule } from "../mails/mails.module";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { SharedModule } from "src/shared/shared.module";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { WalletTransactionService } from "../wallet-transaction/wallet-transaction.service";
import { Wallet } from "../wallet/entities/wallet.entity";
import { WalletService } from "../wallet/wallet.service";
import { DealModule } from "../deal/deal.module";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";
import { Deal } from "../deal/entities/deal.entity";
import { Community } from "../community/entities/community.entity";
import { Event } from "../event/entities/event.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      LoginAttempt,
      Wallet,
      WalletTransaction,
      ActivationChangeLog,
      Deal,
      Community,
      Event,
    ]),
    SharedModule,
    MailsModule,
    DealModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, WalletTransactionService, WalletService],
  exports: [AdminService, WalletTransactionService],
})
export class AdminModule {}
