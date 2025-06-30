import { Module } from "@nestjs/common";
import { FoundationalVoltzService } from "./foundational-voltz.service";
import { FoundationalVoltzController } from "./foundational-voltz.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";
import { User } from "../user/user.entity";
import { NotificationModule } from "../notification/notification.module";
import { PaymentIntent } from "src/shared/entities/payment-intent.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, PaymentIntent]), SharedModule, NotificationModule],
  controllers: [FoundationalVoltzController],
  providers: [FoundationalVoltzService],
})
export class FoundationalVoltzModule {}
