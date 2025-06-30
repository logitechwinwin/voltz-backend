import { Module } from "@nestjs/common";
import { DealService } from "./deal.service";
import { DealController } from "./deal.controller";
import { Deal } from "./entities/deal.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";
import { User } from "../user/user.entity";
import { Product } from "../product/entities/product.entity";
import { S3Module } from "../s3/s3.module";
import { Category } from "../category/entities/category.entity";
import { Wishlist } from "./entities/wishlist.entity";
import { DealRequestModule } from "../deal-request/deal-request.module";
import { DealRequest } from "../deal-request/entities/deal-request.entity";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { WalletService } from "../wallet/wallet.service";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Deal,
      User,
      Product,
      Category,
      Wishlist,
      DealRequest,
      WalletTransaction,
      ActivationChangeLog,
    ]),
    SharedModule,
    S3Module,
    DealRequestModule,
  ],
  controllers: [DealController],
  providers: [DealService, WalletService],
  exports: [DealService],
})
export class DealModule {}
