import { Module } from "@nestjs/common";
import { ActivationChangeLogService } from "./activation-change-log.service";
import { ActivationChangeLogController } from "./activation-change-log.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivationChangeLog } from "./entities/activation-change-log.entity";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [TypeOrmModule.forFeature([ActivationChangeLog]), SharedModule],
  controllers: [ActivationChangeLogController],
  providers: [ActivationChangeLogService],
})
export class ActivationChangeLogModule {}
