import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Topic } from "./entities/topic.entity";
import { TopicController } from "./topic.controller";
import { TopicService } from "./topic.service";
import { SharedModule } from "src/shared/shared.module";

@Module({
  imports: [TypeOrmModule.forFeature([Topic]), SharedModule],
  controllers: [TopicController],
  providers: [TopicService],
})
export class TopicModule {}
