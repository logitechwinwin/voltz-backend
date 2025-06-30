import { Module } from "@nestjs/common";
import { WalletTransactionService } from "./wallet-transaction.service";
import { WalletTransactionController } from "./wallet-transaction.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WalletTransaction } from "./entities/wallet-transaction.entity";
import { Wallet } from "../wallet/entities/wallet.entity";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction]), SharedModule],
  controllers: [WalletTransactionController],
  providers: [WalletTransactionService],
})
export class WalletTransactionModule {}
