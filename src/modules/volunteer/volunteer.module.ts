import { Module } from "@nestjs/common";
import { VolunteerService } from "./volunteer.service";
import { VolunteerController } from "./volunteer.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [TypeOrmModule.forFeature([User]), SharedModule],
  controllers: [VolunteerController],
  providers: [VolunteerService],
})
export class VolunteerModule {}
