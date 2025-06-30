import { Module } from "@nestjs/common";
import { LifeStageService } from "./life-stage.service";
import { LifeStageController } from "./life-stage.controller";
import { LifeStage } from "./entities/life-stage.entity";
import { SharedModule } from "src/shared/shared.module";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([LifeStage]), SharedModule],
  controllers: [LifeStageController],
  providers: [LifeStageService],
})
export class LifeStageModule {}
