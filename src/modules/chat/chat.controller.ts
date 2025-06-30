import { Controller, Get, Post, Body, UseGuards, Query, HttpCode, Param } from "@nestjs/common";
import { IResponse } from "src/shared/interfaces/response.interface";
import { ChatService } from "./chat.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { getAllMessagesDto } from "./dto/get-all-messages.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { User, UserRoles } from "../user/user.entity";
import { FormDataRequest } from "nestjs-form-data";
import { GetChatByRecipientIdDto } from "./dto/get-chat-by-recipient-id.dto";
import { CurrentUser } from "src/decorators/current-user.decorator";

@Controller("chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly events: EventEmitter2,
  ) {}

  @Post("send-message")
  @HttpCode(200)
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  @FormDataRequest()
  async createMessage(@Body() createMessageData: CreateMessageDto, @CurrentUser() user: User): Promise<IResponse> {
    const { message, chat, sendChatToRecipient } = await this.chatService.createMessage(createMessageData, user);

    this.events.emit("chat.message.send", { message, chat, sendChatToRecipient, author: user.id });

    return {
      message: "Message send successfully",
      details: { message, chat, sendChatToRecipient },
    };
  }

  @Get("messages")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async getAllMessages(@Query() getAllDataData: getAllMessagesDto) {
    const message = await this.chatService.getChatMessages(getAllDataData);

    return {
      message: "Messages fetch successfully",
      details: message,
    };
  }

  @Get()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async getAllChatsForUser(@CurrentUser() user: User, @Query() queryData: GetAllDto) {
    const chats = await this.chatService.getAllChatsForUser(user, queryData);

    return {
      message: "Chats fetch successfully",
      details: chats,
    };
  }

  @Get(":recipientId")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.VOLUNTEER)
  async getChatByRecipientId(@Param() getChatByRecipientIdDto: GetChatByRecipientIdDto, @CurrentUser() user: User) {
    const chat = await this.chatService.getChatByRecipientId(getChatByRecipientIdDto, user);

    return {
      message: "Chats fetch successfully",
      details: chat,
    };
  }
}
