import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { MoreThan, Repository } from "typeorm";
import * as moment from "moment";
import { User } from "src/modules/user/user.entity";
import { LoginAttempt } from "src/modules/auth/entities/login-attempt.entity";
import { ActivationStatus } from "../enums";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(LoginAttempt)
    private loginAttemptsRepository: Repository<LoginAttempt>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken) {
      // If there's no token, just proceed without authenticating
      request["user"] = null;
      return true;
    }

    const loginAttempt = await this.loginAttemptsRepository.findOne({
      where: {
        accessToken: accessToken,
        logoutAt: null,
        expireAt: MoreThan(new Date()),
      },
      relations: {
        user: true,
      },
    });

    if (!loginAttempt) {
      // Proceed without user information if the login attempt is not found
      request["user"] = null;
      return true;
    }

    const user = await this.usersRepository.findOne({
      where: {
        id: loginAttempt.user.id,
        deletedAt: null,
        activationStatus: ActivationStatus.ACTIVE,
      },
      relations: {
        topics: true,
        sdgs: true,
        lifeStages: true,
      },
    });

    if (!user) {
      // Proceed without user information if the user is not found
      request["user"] = null;
      return true;
    }

    // Update token expiry
    loginAttempt.expireAt = moment().add(1, "M").toDate();
    await this.loginAttemptsRepository.save(loginAttempt);

    // Attach the user to the request object
    request["user"] = user;
    request["loginAttempt"] = loginAttempt;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
