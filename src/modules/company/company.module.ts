import { Module } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CompanyController } from "./company.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { S3Module } from "../s3/s3.module";
import { Follow } from "../follow/entities/follow.entity";
import { Deal } from "../deal/entities/deal.entity";
import { DealRequest } from "../deal-request/entities/deal-request.entity";
import { Product } from "../product/entities/product.entity";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { DealModule } from "../deal/deal.module";
import { SharedModule } from "src/shared/shared.module";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DealRequest, LoginAttempt, Follow, Deal, WalletTransaction, Product]),
    S3Module,
    DealModule,
    SharedModule,
    WalletModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
