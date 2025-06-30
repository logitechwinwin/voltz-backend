import { Module } from "@nestjs/common";
import { S3Service } from "./s3.service";
import { S3Controller } from "./s3.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [SharedModule],
  controllers: [S3Controller],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
