import { Module } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { SharedModule } from "src/shared/shared.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment } from "./entities/comment.entity";
import { Post } from "../post/entities/post.entity";
import { Community } from "../community/entities/community.entity";
import { EventCommentsController } from "./event-comments.controller";
import { EventCommentsService } from "./event-comments.service";
import { EventComment } from "./entities/event-comment.entity";
import { Event } from "../event/entities/event.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Post, Community, EventComment, Event]), SharedModule],
  controllers: [CommentsController, EventCommentsController],
  providers: [CommentsService, EventCommentsService],
})
export class CommentsModule {}
