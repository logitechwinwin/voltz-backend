import { IoAdapter } from "@nestjs/platform-socket.io";
import { EntityManager, MoreThan } from "typeorm";
import { LoginAttempt } from "src/modules/auth/entities/login-attempt.entity";
import { AuthenticatedSocket } from "src/modules/chat/socket.session";
import { InjectEntityManager } from "@nestjs/typeorm";
import { INestApplicationContext, UnauthorizedException } from "@nestjs/common";
import { User } from "src/modules/user/user.entity";
import * as moment from "moment";
import { ActivationStatus } from "src/shared/enums";
import { NextFunction } from "express";
import { WsException } from "@nestjs/websockets";

export class WebsocketAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,

    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: any) {
    const loginAttemptsRepository = this.entityManager.getRepository(LoginAttempt);
    const usersRepository = this.entityManager.getRepository(User);

    const server = super.createIOServer(port, options);

    server.use(async (socket: AuthenticatedSocket, next: NextFunction) => {
      const { accesstoken } = socket.handshake.headers;

      if (!accesstoken) {
        return next(new UnauthorizedException("Please provide access token"));
      }

      const loginAttempt = await loginAttemptsRepository.findOne({
        where: {
          accessToken: String(accesstoken),
          logoutAt: null,
          expireAt: MoreThan(new Date()),
        },
        relations: {
          user: true,
        },
      });

      if (!loginAttempt) {
        return next(new UnauthorizedException("Please login again"));
      }

      const user = await usersRepository.findOne({
        where: {
          id: loginAttempt?.user?.id,
          deletedAt: null,
          activationStatus: ActivationStatus.ACTIVE,
        },
        relations: {
          topics: true,
          sdgs: true,
          lifeStages: true,
          interestedLocations: true,
          wallet: true,
        },
      });

      if (!user) {
        return next(new UnauthorizedException("Session expired"));
      }

      loginAttempt.expireAt = moment().add(1, "M").toDate();
      loginAttempt.userSocketId = socket.id;

      await loginAttemptsRepository.save(loginAttempt);

      socket.user = user;
      socket.userSocketId = socket.id;

      return next();
    });

    return server;
  }
}
