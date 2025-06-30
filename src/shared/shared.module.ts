import { Module } from "@nestjs/common";
import { IsUniqueConstraint } from "./validations/is-unique.validation";
import { IsUserExists } from "./validations/userValidations/is-user-exists.validation";
import { IsUserUnique } from "./validations/userValidations/is-user-unique.validation";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LoginAttempt } from "src/modules/auth/entities/login-attempt.entity";
import { User } from "src/modules/user/user.entity";
import { PaymentService } from "./services/payment.service";
import { Notification } from "../modules/notification/entities/notification.entity";
import { CsvService } from "./services/csv.service";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Wallet } from "src/modules/wallet/entities/wallet.entity";
import { TransactionManagerService } from "./services/transaction-manager.service";
import { Logger } from "src/modules/logger/entities/logger.entity";
import { LoggerModule } from "src/modules/logger/logger.module";
import { LocationService } from "./services/location.service";

/**
 * The SharedModule is a globally accessible module that provides
 * commonly used services across the application, including JWT functionality.
 *
 * Usage:
 * - This module allows other modules to easily access the JwtService
 *   without having to register the JwtModule in each individual module.
 */

@Module({
  imports: [
    TypeOrmModule.forFeature([LoginAttempt, User, Wallet, Notification]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get("jwt.secret"),
        signOptions: {
          expiresIn: "50d",
        },
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
  ],
  providers: [
    IsUniqueConstraint,
    IsUserExists,
    IsUserUnique,
    PaymentService,
    CsvService,
    TransactionManagerService,
    LocationService,
  ],
  exports: [
    IsUniqueConstraint,
    IsUserExists,
    IsUserUnique,
    TypeOrmModule,
    PaymentService,
    CsvService,
    JwtModule,
    TransactionManagerService,
    LocationService,
  ],
})
export class SharedModule {}
