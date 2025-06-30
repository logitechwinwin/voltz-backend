import { Module } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { Chat } from "./entities/chat.entity";
import { ChatParticipant } from "./entities/chat-participant.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Media } from "./entities/media.entity";
import { User } from "../user/user.entity";
import { ChatController } from "./chat.controller";
import { GatewaySessionManager } from "./socket.session";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatParticipant, Message, Media, User, LoginAttempt]), NotificationModule],
  providers: [ChatGateway, ChatService, GatewaySessionManager],
  controllers: [ChatController],
})
export class ChatModule {}
