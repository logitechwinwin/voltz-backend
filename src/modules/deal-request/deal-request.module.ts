import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";
import { Deal } from "../deal/entities/deal.entity";
import { NotificationModule } from "../notification/notification.module";
import { User } from "../user/user.entity";
import { DealRequestController } from "./deal-request.controller";
import { DealRequestService } from "./deal-request.service";
import { DealRequest } from "./entities/deal-request.entity";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { Wallet } from "../wallet/entities/wallet.entity";
import { WalletService } from "../wallet/wallet.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([DealRequest, WalletTransaction, Deal, User, Wallet]),
    SharedModule,
    NotificationModule,
  ],
  controllers: [DealRequestController],
  providers: [DealRequestService, WalletService],
  exports: [DealRequestService],
})
export class DealRequestModule {}
