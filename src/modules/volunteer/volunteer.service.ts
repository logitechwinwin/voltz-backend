import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RegistrationStatus, User, UserRoles } from "../user/user.entity";
import { Repository } from "typeorm";
import { GetAllVolunteersDto } from "./dto/get-all-volunteers.dto";
import { IPaginationOptions, paginate, paginateRaw } from "nestjs-typeorm-paginate";

@Injectable()
export class VolunteerService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAll(queryData: GetAllVolunteersDto) {
    const { page, perPage, search, sdgs, activationStatus } = queryData;

    const baseQuery = this.usersRepository
      .createQueryBuilder("user")
      .leftJoin("user.followers", "followers")
      .select([`"user".*`, `COUNT(followers.id) AS "followersCount"`])
      .where("user.role = :role", { role: UserRoles.VOLUNTEER })
      .groupBy("user.id");

    if (activationStatus) {
      baseQuery.andWhere("user.activationStatus = :activationStatus", { activationStatus });
    }

    if (search) {
      baseQuery.andWhere(`(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)`, {
        search: `%${search}%`,
      });
    }

    if (sdgs?.length) {
      baseQuery.innerJoin("user.sdgs", "sdg").andWhere("sdg.id IN (:...sdgs)", { sdgs });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const rawResults = await paginateRaw(baseQuery, paginationOptions);

    return rawResults;
  }

  async deleteAccount(user: User) {
    user.deletedAt = new Date();
    user.firstName = "Voltz";
    user.lastName = "User";
    user.email = null;
    user.phoneNumber = null;
    user.password = null;
    await this.usersRepository.save(user);
  }
}
