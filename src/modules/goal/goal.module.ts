import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";
import { Event } from "../event/entities/event.entity";
import { NotificationModule } from "../notification/notification.module";
import { User } from "../user/user.entity";
import { VolunteerRequest } from "../volunteer-request/entities/volunteer-request.entity";
import { VolunteerRequestModule } from "../volunteer-request/volunteer-request.module";
import { VolunteerRequestService } from "../volunteer-request/volunteer-request.service";
import { Goal } from "./entities/goal.entity";
import { GoalController } from "./goal.controller";
import { GoalService } from "./goal.service";
import { WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { WalletTransactionService } from "../wallet-transaction/wallet-transaction.service";
import { WalletService } from "../wallet/wallet.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Goal, VolunteerRequest, Event, WalletTransaction]),
    VolunteerRequestModule,
    SharedModule,
    NotificationModule,
  ],
  controllers: [GoalController],
  providers: [GoalService, VolunteerRequestService, WalletTransactionService, WalletService],
})
export class GoalModule {}
