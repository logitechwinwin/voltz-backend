import { Module } from "@nestjs/common";
import { SdgService } from "./sdg.service";
import { SdgController } from "./sdg.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Sdg } from "./entities/sdg.entity";
import { SharedModule } from "src/shared/shared.module";
import { S3Module } from "../s3/s3.module";

@Module({
  imports: [TypeOrmModule.forFeature([Sdg]), SharedModule, S3Module],
  controllers: [SdgController],
  providers: [SdgService],
})
export class SdgModule {}
