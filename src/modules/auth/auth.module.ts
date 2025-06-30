import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { MailsModule } from "../mails/mails.module";
import { S3Module } from "../s3/s3.module";
import { User } from "../user/user.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LoginAttempt } from "./entities/login-attempt.entity";
import { Otp } from "./entities/otp.entity";
import { AppleAuthService } from "./services/apple.auth.service";
import { FacebookAuthService } from "./services/facebook.auth.service";
import { GoogleAuthService } from "./services/google.auth.service";
import { SharedModule } from "src/shared/shared.module";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { Wallet } from "../wallet/entities/wallet.entity";
import { WalletService } from "../wallet/wallet.service";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, LoginAttempt, Otp, Wallet, WalletTransaction]),
    SharedModule,
    MailsModule,
    S3Module,
    AdminModule,
    NotificationModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthService, FacebookAuthService, AppleAuthService, WalletService],
})
export class AuthModule {}
