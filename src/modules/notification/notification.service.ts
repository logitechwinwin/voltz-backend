import { BadGatewayException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as firebase from "firebase-admin";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { User } from "src/modules/user/user.entity";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { In, Repository } from "typeorm";
import { GetAllDto } from "./../../shared/dtos/getAll.dto";
import { Notification, NotificationStatus } from "./entities/notification.entity";
import { NotificationData } from "./interfaces/notification-data.interface";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly configService: ConfigService,
  ) {
    const firebaseCredentials = this.configService.get("firebase");

    firebase.initializeApp({
      credential: firebase.credential.cert(firebaseCredentials),
    });
  }

  async sendNotification(user: User, notificationData: NotificationData): Promise<void> {
    const { title, message, bannerImage, profileImage, data } = notificationData;

    // Save the notification record
    const notification = this.notificationRepository.create({
      title,
      message,
      data: JSON.stringify(data),
      user,
    });

    await this.notificationRepository.save(notification);

    // Fetch distinct device tokens for the user
    const loginAttempts = await this.loginAttemptRepository
      .createQueryBuilder("loginAttempt")
      .leftJoinAndSelect("loginAttempt.user", "user")
      .where("loginAttempt.userId = :userId", { userId: user.id })
      .andWhere("loginAttempt.expireAt > :currentDate", { currentDate: new Date() })
      .andWhere("loginAttempt.logoutAt IS NULL")
      .andWhere("loginAttempt.allowNotification = :allowNotification", { allowNotification: true })
      .getMany();

    const tokens = loginAttempts.map(attempt => attempt.fcmDeviceToken).filter(Boolean);

    if (!tokens.length) {
      return;
    }

    const payload = {
      tokens,
      notification: {
        title,
        body: message,
        ...(bannerImage && { imageUrl: bannerImage }),
      },
      data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
      webpush: {
        notification: {
          badge:
            profileImage ||
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkoyUQaux4PEUmEPGc7PodeN8XbgC4aOBsug&s",
          icon:
            profileImage ||
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkoyUQaux4PEUmEPGc7PodeN8XbgC4aOBsug&s",
        },
      },
    };

    try {
      // Send notification to all tokens
      const response = await firebase.messaging().sendEachForMulticast(payload);

      const invalidTokens = [];
      response.responses.forEach((result, index) => {
        if (!result.success) {
          invalidTokens.push(tokens[index]); // Collect invalid tokens
        }
      });

      if (invalidTokens.length > 0) {
        await this.loginAttemptRepository
          .createQueryBuilder()
          .update(LoginAttempt)
          .set({ expireAt: new Date() }) // Set expireAt to the current date
          .where("fcmDeviceToken IN (:...invalidTokens)", { invalidTokens })
          .execute();
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  async sendNotificationToMultipleUsers(userIds: number[], notificationData: NotificationData): Promise<void> {
    const { title, message, bannerImage, profileImage, data } = notificationData;

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
    });

    // Save notifications in bulk
    const notifications = users.map(user =>
      this.notificationRepository.create({
        title,
        message,
        data: JSON.stringify(data),
        user,
      }),
    );

    await this.notificationRepository.save(notifications);

    const loginAttempts = await this.loginAttemptRepository
      .createQueryBuilder("loginAttempt")
      .leftJoinAndSelect("loginAttempt.user", "user")
      .where("loginAttempt.userId IN (:...userIds)", { userIds })
      .andWhere("loginAttempt.expireAt > :currentDate", { currentDate: new Date() })
      .andWhere("loginAttempt.logoutAt IS NULL")
      .andWhere("loginAttempt.allowNotification = :allowNotification", { allowNotification: true })
      .getMany();

    const tokens = loginAttempts.map(attempt => attempt.fcmDeviceToken).filter(Boolean);

    if (tokens.length) {
      const payload = {
        tokens,
        notification: {
          title,
          body: message,
          imageUrl: bannerImage || "https://voltz.global/_next/static/media/splash-logo.5ad2fe69.svg",
        },
        data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
        webpush: {
          notification: {
            badge:
              profileImage ||
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkoyUQaux4PEUmEPGc7PodeN8XbgC4aOBsug&s",
            icon:
              profileImage ||
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkoyUQaux4PEUmEPGc7PodeN8XbgC4aOBsug&s",
          },
        },
      };

      try {
        const response = await firebase.messaging().sendEachForMulticast(payload);

        const invalidTokens = [];
        response.responses.forEach((result, index) => {
          if (!result.success) {
            invalidTokens.push(tokens[index]);
          }
        });

        // Remove invalid device tokens
        if (invalidTokens.length > 0) {
          await this.loginAttemptRepository
            .createQueryBuilder()
            .update(LoginAttempt)
            .set({ expireAt: new Date() }) // Set expireAt to the current date
            .where("fcmDeviceToken IN (:...invalidTokens)", { invalidTokens })
            .execute();
        }
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    }
  }

  async getNotifications(userId: number, getAllData: GetAllDto) {
    const { page, perPage, search } = getAllData;

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const queryBuilder = this.notificationRepository
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.user", "user")
      .where("user.id = :userId", { userId })
      .orderBy("notification.createdAt", "DESC");

    // If search functionality is needed
    if (search) {
      queryBuilder.andWhere("notification.title LIKE :search", {
        search: `%${search}%`,
      });
    }

    return paginate<Notification>(queryBuilder, paginationOptions);
  }

  async update(notificationId: ParamIdDto) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId.id },
    });
    if (!notification) {
      throw new BadGatewayException("Notification not found");
    }
    notification.status = NotificationStatus.READ;
    await this.notificationRepository.save(notification);
  }

  async marksAllAsRead(user: User): Promise<void> {
    const notifications = await this.notificationRepository.find({
      where: { user: { id: user.id }, status: NotificationStatus.SENT },
    });

    if (notifications.length === 0) {
      return;
    }

    notifications.forEach(notification => {
      notification.status = NotificationStatus.READ;
    });

    await this.notificationRepository.save(notifications);
  }

  async deleteNotification(notificationId: number, user: User): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user: { id: user.id } },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    await this.notificationRepository.remove(notification);
  }
}
