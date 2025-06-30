import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { MoreThan, Repository } from "typeorm";
import * as moment from "moment";
import { User } from "src/modules/user/user.entity";
import { LoginAttempt } from "src/modules/auth/entities/login-attempt.entity";
import { ActivationStatus } from "../enums";

@Injectable()
export class AuthenticationGuard implements CanActivate {
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
      throw new UnauthorizedException("Please provide access token");
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
      throw new UnauthorizedException("Please login again");
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
        interestedLocations: true,
        wallet: true,
        campaignManagerCreatedBy: {
          wallet: true,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Session expired");
    }

    loginAttempt.expireAt = moment().add(1, "M").toDate();
    await this.loginAttemptsRepository.save(loginAttempt);

    request["user"] = user;
    request["loginAttempt"] = loginAttempt;

    return true;
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
