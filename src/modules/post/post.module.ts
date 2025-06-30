import { Module } from "@nestjs/common";
import { PostService } from "./post.service";
import { PostController } from "./post.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "src/shared/shared.module";
import { Post } from "./entities/post.entity";
import { Community } from "../community/entities/community.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Post, Community]), SharedModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
