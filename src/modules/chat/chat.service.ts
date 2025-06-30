import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { Not, Repository } from "typeorm";
import { User } from "../user/user.entity";
import { CreateMessageDto } from "./dto/create-message.dto";
import { getAllMessagesDto } from "./dto/get-all-messages.dto";
import { GetChatByRecipientIdDto } from "./dto/get-chat-by-recipient-id.dto";
import { ChatParticipant } from "./entities/chat-participant.entity";
import { Chat, ChatType } from "./entities/chat.entity";
import { Message, MessageStatus } from "./entities/message.entity";

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,

    @InjectRepository(ChatParticipant)
    private chatParticipantRepository: Repository<ChatParticipant>,
  ) {}

  async findChat(senderId: number, recipientId: number, type = "one") {
    const query = this.chatRepository
      .createQueryBuilder("chat")
      .leftJoinAndSelect("chat.participants", "participant")
      .leftJoinAndSelect("participant.user", "user")
      .leftJoinAndSelect("chat.lastMessageSent", "lastMessageSent")
      .where("chat.type = :type", { type: "individual" })
      .andWhere(
        "(participant.userId = :senderId AND chat.id IN " +
          '(SELECT "chatId" FROM "chat_participant" WHERE "userId" = :recipientId))' +
          "OR (participant.userId = :recipientId AND chat.id IN " +
          '(SELECT "chatId" FROM "chat_participant" WHERE "userId" = :senderId))',
        { senderId, recipientId },
      )
      .select([
        "chat.*",
        `chat.lastMessageSentAt as "lastMessageSentAt"`,
        `json_build_object('id', lastMessageSent.id, 'content', lastMessageSent.content,'createdAt', lastMessageSent.createdAt,'updatedAt', lastMessageSent.updatedAt) AS "lastMessageSent"`,
        `COALESCE(json_agg(DISTINCT jsonb_build_object('id', participant.id,
        'user', 
        json_build_object('id', user.id,'isOnline', user.isOnline,'lastOnline', user.lastOnline, 'name', user.name, 'profileImage', user.profileImage, 'bannerImage', user.bannerImage, 'firstName', user.firstName,
         'lastName', user.lastName, 'role', user.role, 'activationStatus', user.activationStatus))), '[]') as participants`,
      ])
      .addSelect(subQuery => {
        return subQuery
          .select("COUNT(messages.id)", "unreadCount")
          .from("Message", "messages")
          .where("messages.chatId = chat.id")
          .andWhere("messages.status = 'unread'")
          .andWhere("messages.sender.id != :userId", { userId: recipientId });
      }, "unreadCount")
      .groupBy("chat.id")
      .addGroupBy("lastMessageSent.id");

    // Decide whether to fetch one chat or all
    let chat;
    if (type === "one") {
      chat = await query.getRawOne();
    } else if (type === "all") {
      chat = await query.getMany();
    }

    if (!chat) {
      return null;
    }

    return chat;
  }

  async findChatUserId(userId) {
    const query = await this.chatRepository
      .createQueryBuilder("chat")
      .leftJoinAndSelect("chat.participants", "participant")
      .leftJoinAndSelect("participant.user", "user")
      .where("chat.type = :type", { type: "individual" })
      .andWhere(
        "participant.userId = :userId OR chat.id IN " +
          '(SELECT "chatId" FROM "chat_participant" WHERE "userId" = :userId)',
        { userId },
      )
      .distinctOn(["participant.user"])
      .getMany();

    return query;
  }

  async createChat(senderId: number, recipientId: number, type: ChatType = ChatType.INDIVIDUAL): Promise<Chat> {
    // Find the sender and recipient by their IDs
    const sender = await this.usersRepository.findOne({ where: { id: senderId } });
    const recipient = await this.usersRepository.findOne({ where: { id: recipientId } });

    // Check if both sender and recipient exist
    if (!sender || !recipient) {
      throw new Error("Sender or recipient not found");
    }

    // Create and save the chat entity with the specified type
    const chat = await this.chatRepository.save(this.chatRepository.create({ type, creator: sender }));

    // Create and save chat participants for sender and recipient
    const senderParticipant = await this.chatParticipantRepository.save(
      this.chatParticipantRepository.create({
        user: sender,
        chat: chat,
      }),
    );

    const recipientParticipant = await this.chatParticipantRepository.save(
      this.chatParticipantRepository.create({
        user: recipient,
        chat: chat,
      }),
    );

    // Assign participants to the chat
    chat.participants = [senderParticipant, recipientParticipant];

    // Save the chat again to ensure participants are persisted
    const savedChat = await this.chatRepository.save(chat);

    // Return the chat with participants excluding the sender
    // return {
    //   ...savedChat,
    //   participants: savedChat.participants.filter(participant => participant.user.id !== senderId),
    // };
    return savedChat;
  }

  async createMessage(createMessageData: CreateMessageDto, user: User) {
    const senderId = user.id;
    const { recipientId, content } = createMessageData;

    if (recipientId === user.id) {
      throw new BadRequestException("You can't send message to yourself");
    }

    let sendChatToRecipient = false;

    let chat = await this.findChat(senderId, recipientId);

    if (!chat) {
      sendChatToRecipient = true;
      chat = await this.createChat(senderId, recipientId);
    }

    const sender = await this.usersRepository.findOne({ where: { id: senderId } });

    const message = this.messageRepository.create({
      content,
      chat: Object.assign(new Chat(), { id: chat.id }),
      sender,
    });

    const createdMessage = await this.messageRepository.save(message);
    chat.lastMessageSent = createdMessage;
    chat.lastMessageSentAt = new Date();
    let savedChat = await this.chatRepository.save(chat);

    let updatedChat = await this.findChat(senderId, recipientId);

    return { message: createdMessage, chat: updatedChat, sendChatToRecipient };
  }

  async getChatMessages(
    getAllMessagesData: getAllMessagesDto,
  ): Promise<{ items: Message[]; meta: { nextCursor: number | null } }> {
    const { chatId, search, lastMessageId, limit } = getAllMessagesData;

    // Create a query builder for the Message entity
    const queryBuilder = this.messageRepository
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.sender", "user")
      .select([
        "message.*",
        "json_build_object('id', user.id, 'name', user.name, 'profileImage', user.profileImage, 'bannerImage', user.bannerImage, 'firstName', user.firstName, 'lastName', user.lastName, 'role', user.role, 'activationStatus', user.activationStatus) as sender",
      ])
      .where("message.chatId = :chatId", { chatId })
      .orderBy("message.id", "DESC")
      .addOrderBy("message.createdAt", "DESC")
      .limit(limit); // Limit the number of messages to fetch

    // If there's a lastMessageId, paginate by skipping messages before this ID
    if (lastMessageId) {
      queryBuilder.andWhere("message.id < :lastMessageId", { lastMessageId });
    }

    // Add search functionality if a search term is provided
    if (search) {
      queryBuilder.andWhere("message.content ILIKE :search", {
        search: `%${search}%`,
      });
    }

    // Execute the query and get the results
    const messages = await queryBuilder.getRawMany();

    // Calculate the next cursor by getting the ID of the last message in the result
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;

    return {
      items: messages,
      meta: {
        nextCursor: nextCursor,
      },
    };
  }

  async getAllChatsForUser(user: User, queryData: GetAllDto) {
    const userId = user.id;

    const queryBuilder = this.chatRepository
      .createQueryBuilder("chat")
      .leftJoinAndSelect("chat.participants", "participant")
      .leftJoinAndSelect("participant.user", "user")
      .leftJoin("chat.messages", "messages")
      .leftJoinAndSelect("chat.lastMessageSent", "lastMessageSent")
      // Ensure we're only selecting chats where the user is a participant
      .where(qb => {
        const subQuery = qb
          .subQuery()
          .select("subParticipant.chatId")
          .from("ChatParticipant", "subParticipant")
          .where("subParticipant.userId = :userId")
          .getQuery();
        return "chat.id IN " + subQuery;
      })
      .select([
        "chat.*",
        `chat.lastMessageSentAt as "lastMessageSentAt"`,
        `json_build_object('id', lastMessageSent.id, 'content', lastMessageSent.content,'createdAt', lastMessageSent.createdAt,'updatedAt', lastMessageSent.updatedAt) AS "lastMessageSent"`,
        `COALESCE(json_agg(DISTINCT jsonb_build_object('id', participant.id,
        'user', 
        json_build_object('id', user.id,'isOnline', user.isOnline,'lastOnline', user.lastOnline, 'name', user.name, 'profileImage', user.profileImage, 'bannerImage', user.bannerImage, 'firstName', user.firstName,
         'lastName', user.lastName, 'role', user.role, 'activationStatus', user.activationStatus))), '[]') as participants`,
      ])
      .addSelect(subQuery => {
        return subQuery
          .select("COUNT(messages.id)", "unreadCount")
          .from("Message", "messages")
          .where("messages.chatId = chat.id")
          .andWhere("messages.status = 'unread'")
          .andWhere("messages.sender.id != :userId");
      }, "unreadCount")
      .setParameter("userId", userId)
      .groupBy("chat.id")
      .addGroupBy("lastMessageSent.id")
      .orderBy("chat.updatedAt", "DESC")
      .addOrderBy("lastMessageSent.createdAt", "DESC");

    // Apply search filter on chats based on user name, but still include all participants
    // Apply search filter on chats based on user name
    if (queryData?.search) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1
          FROM chat_participant subParticipant
          INNER JOIN "user" searchUser ON searchUser.id = subParticipant."userId"
          WHERE subParticipant."chatId" = chat.id
          AND (
            (
              (searchUser."firstName" || ' ' || searchUser."lastName") ILIKE :fullName
            ) OR (
              searchUser.name ILIKE :name
            )
          )
        )`,
        {
          fullName: `%${queryData.search}%`,
          name: `%${queryData.search}%`,
        },
      );
    }

    return await queryBuilder.getRawMany();
  }

  async markMessagesAsRead(chatId: number, user: User, limit?: number): Promise<Message[]> {
    // Step 1: Find the unread messages that will be marked as read
    const unreadMessages = await this.messageRepository.find({
      where: {
        chat: { id: chatId },
        status: MessageStatus.UNREAD,
        sender: { id: Not(user.id) },
      },
      order: { updatedAt: "DESC" },
      take: limit || 10,
    });

    // Step 2: If there are unread messages, update their status to 'READ'
    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(message => message.id);

      await this.messageRepository
        .createQueryBuilder()
        .update(Message)
        .set({ status: MessageStatus.READ })
        .whereInIds(messageIds)
        .execute();
    }

    // Step 3: Return the messages that were updated (marked as read)
    return unreadMessages.map(each => ({ ...each, status: MessageStatus.READ }));
  }

  async getChatByRecipientId(getChatByRecipientIdDto: GetChatByRecipientIdDto, user: User) {
    const { recipientId } = getChatByRecipientIdDto;

    return await this.findChat(user.id, recipientId);
  }
}
