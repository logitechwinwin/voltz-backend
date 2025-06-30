import { Injectable } from "@nestjs/common";
import { CreateActivationChangeLogDto } from "./dto/create-activation-change-log.dto";
import { UpdateActivationChangeLogDto } from "./dto/update-activation-change-log.dto";
import { GetAllActivationChangeLogDto } from "./dto/get-all-activation-change-log.dto";
import { ActivationChangeLog } from "./entities/activation-change-log.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { User } from "../user/user.entity";

@Injectable()
export class ActivationChangeLogService {
  constructor(
    @InjectRepository(ActivationChangeLog)
    private readonly activationChangeLogRepository: Repository<ActivationChangeLog>,
  ) {}

  create(createActivationChangeLogDto: CreateActivationChangeLogDto) {}

  async findAll(getAllActivationChangeLogDto: GetAllActivationChangeLogDto) {
    const { eventId, dealId, page, perPage, userId, communityId } = getAllActivationChangeLogDto;

    const query = this.activationChangeLogRepository
      .createQueryBuilder("log")
      .leftJoin("log.admin", "admin")
      .addSelect(["admin.id", "admin.firstName", "admin.lastName", "admin.email"])
      .orderBy("log.createdAt", "DESC");

    if (eventId) {
      query.leftJoinAndSelect("log.event", "event").andWhere("event.id = :eventId", { eventId: eventId });
    }

    if (dealId) {
      query.leftJoinAndSelect("log.deal", "deal").andWhere("deal.id = :dealId", { dealId: dealId });
    }

    if (userId) {
      query.leftJoinAndSelect("log.user", "user").andWhere("user.id = :userId", { userId: userId });
    }

    if (communityId) {
      query
        .leftJoinAndSelect("log.community", "community")
        .andWhere("community.id = :communityId", { communityId: communityId });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate(query, paginationOptions);
  }

  findOne(id: number) {
    return `This action returns a #${id} activationChangeLog`;
  }

  update(id: number, updateActivationChangeLogDto: UpdateActivationChangeLogDto) {
    return `This action updates a #${id} activationChangeLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} activationChangeLog`;
  }
}
