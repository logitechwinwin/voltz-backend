import { Module } from "@nestjs/common";
import { StoryService } from "./story.service";
import { StoryController } from "./story.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Story } from "./entities/story.entity";
import { SharedModule } from "src/shared/shared.module";
import { S3Module } from "../s3/s3.module";
import { User } from "../user/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Story, User]), SharedModule, S3Module],
  controllers: [StoryController],
  providers: [StoryService],
})
export class StoryModule {}
