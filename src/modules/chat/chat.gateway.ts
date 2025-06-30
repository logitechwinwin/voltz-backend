import { Inject } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Repository } from "typeorm";
import { NotificationService } from "../notification/notification.service";
import { User, UserRoles } from "../user/user.entity";
import { ChatService } from "./chat.service";
import { AuthenticatedSocket, GatewaySessionManager } from "./socket.session";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { Message } from "./entities/message.entity";
import { Chat } from "./entities/chat.entity";

interface ISendMessagePayload {
  message: Message;
  chat: Chat;
  sendChatToRecipient: User;
  author: number;
}

@WebSocketGateway({ cors: true, pingInterval: 10000, pingTimeout: 15000 })
export class ChatGateway {
  constructor(
    @Inject()
    private readonly sessions: GatewaySessionManager,

    @Inject()
    private readonly notificationService: NotificationService,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private chatService: ChatService,
  ) {}

  @WebSocketServer()
  private server: Server;

  // Handle new connection
  async handleConnection(socket: AuthenticatedSocket, ...args: any[]) {
    this.sessions.setUserSocket(socket.user.id, socket);
    const user = await this.usersRepository.findOne({ where: { id: socket.user.id } });
    if (user) {
      user.isOnline = true;
      user.lastOnline = null;
      console.log("user online", socket.user.id);
      await this.usersRepository.save(user);
    }
  }

  // Handle disconnect, remove the specific socket, check if other sockets are active
  async handleDisconnect(socket: AuthenticatedSocket) {
    this.sessions.removeUserSocket(socket.user.id, socket.id); // Use socket.id to remove the specific socket
    const remainingSockets = this.sessions.getUserSockets(socket.user.id);

    if (!remainingSockets || remainingSockets.length === 0) {
      const user = await this.usersRepository.findOne({ where: { id: socket.user.id } });
      if (user) {
        user.isOnline = false;
        user.lastOnline = new Date();
        console.log("user offline", socket.user.id);
        await this.usersRepository.save(user);
      }
    }
  }

  // Handle sending chat message
  @OnEvent("chat.message.send")
  async create(payload: ISendMessagePayload) {
    const { message, chat, sendChatToRecipient, author } = payload;

    const recipient = chat?.participants?.find(participant => participant.user.id !== author).user;
    const sender = chat?.participants?.find(participant => participant.user.id === author).user;

    const recipientSockets = this.sessions.getUserSockets(recipient.id);

    // TODO: SEE IF THEIR IS A REQUIREMENT FOR THE SENDER TO RECEIVE THE MESSAGE ON THE OTHER LOGIN ATTEMPTS THEN THE ONE FROM WHICH HE IS SENDING MESSAGE

    const notificationData = {
      title: `New message from ${sender.role === UserRoles.VOLUNTEER ? sender.firstName : sender.name}`,
      message: message.content,
      profileImage: sender.profileImage,
      bannerImage: sender.bannerImage,
      data: {
        sender: JSON.stringify(sender),
        recipient: JSON.stringify(recipient),
        notificationType: NotificationType.NEW_MESSAGE,
        chatId: chat.id,
      },
    };

    await this.notificationService.sendNotification(recipient, notificationData);

    // Emit message to all connected sockets of the recipient
    if (recipientSockets) {
      recipientSockets.forEach(socket => {
        // const newSocket = this.server.sockets.sockets.get(socket.id); OR this.server.to(socket.id).emit('userAllRooms', rooms); // TODO: WE CAN GET THE SOCKET FROM THE SERVER THEN WHY SAVING COMPLETE SOCKET ??
        socket.emit("onMessage", { message, sendChatToRecipient, chat, author });
      });
    }
  }

  // Handle user joining chat
  @SubscribeMessage("onChatJoin")
  onConversationJoin(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    console.log(`Client ${client.id} joining chat-${data.chatId}`);
    client.join(`chat-${data.chatId}`);

    console.log(`Emitting userJoin to chat-${data.chatId}`);
    client.to(`chat-${data.chatId}`).emit("userJoin"); // Purpose ?
  }

  // Handle user leaving chat
  @SubscribeMessage("onChatLeave")
  onConversationLeave(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    client.leave(`chat-${data.chatId}`);
    console.log("🚀 ~ ChatGateway ~ onConversationLeave ~ `chat-${data.chatId}`:", `chat-${data.chatId}`);
    client.to(`chat-${data.chatId}`).emit("userLeave"); // purpose ?
  }

  // Handle marking messages as read
  @SubscribeMessage("onMessageMarkAsRead")
  async onMarkAsRead(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    const { chatId, limit } = data;
    const messages = await this.chatService.markMessagesAsRead(chatId, client.user, limit);
    console.log(`Emitting onMessageMarkAsRead to chat-${data.chatId}`);

    client.to(`chat-${data.chatId}`).emit("onMessageRead", { messages });
  }

  // Handle typing start
  @SubscribeMessage("onTypingStart")
  onTypingStart(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    console.log("onTypingStart");
    console.log(data.chatId);
    console.log(client.rooms);
    client.to(`conversation-${data.chatId}`).emit("onTypingStart");
  }

  // Handle typing stop
  @SubscribeMessage("onTypingStop")
  onTypingStop(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    console.log("onTypingStop");
    console.log(data.conversationId);
    console.log(client.rooms);
    client.to(`conversation-${data.conversationId}`).emit("onTypingStop");
  }

  // Test event for joining a chat
  @SubscribeMessage("onTest") // TODO: why it is still here??
  onTest(@MessageBody() data: any, @ConnectedSocket() client: AuthenticatedSocket) {
    console.log("fired");
    client.to(`chat-${6}`).emit("userJoin");
  }
}
