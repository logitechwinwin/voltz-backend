import { Module } from "@nestjs/common";
import { GuestUserService } from "./guest-user.service";
import { GuestUserController } from "./guest-user.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GuestUser } from "./entities/guest-user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([GuestUser])],
  controllers: [GuestUserController],
  providers: [GuestUserService],
})
export class GuestUserModule {}
