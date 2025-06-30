import { NotificationService } from "../notification/notification.service";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { User, UserRoles } from "../user/user.entity";
import { Follow } from "./entities/follow.entity";
import { IPaginationOptions, paginate, paginateRaw } from "nestjs-typeorm-paginate";
import { GetAllDto } from "./entities/get-all.dto";
import { NotificationData } from "../notification/interfaces/notification-data.interface";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { ActivationStatus } from "src/shared/enums";

@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly notificationService: NotificationService,
  ) {}

  async followUser(user: User, followeeId: number) {
    const followee = await this.userRepository.findOne({ where: { id: followeeId } });

    const { profileImage, bannerImage } = user;

    if (!user || !followee) {
      throw new NotFoundException("User not found");
    }

    if (user.role !== UserRoles.VOLUNTEER) {
      throw new BadRequestException("Only volunteers can follow others");
    }

    if (user.id === followeeId) {
      throw new BadRequestException("You can not follow yourself");
    }

    const existingFollow = await this.followRepository.findOne({
      where: { follower: { id: user.id }, followee: { id: followeeId } },
    });
    if (existingFollow) {
      throw new BadRequestException("You are already following this user");
    }

    const follow = this.followRepository.create({ follower: user, followee });

    const data = {
      title: "New follower",
      message: `${user.firstName} ${user.lastName} started following you`,
      profileImage,
      bannerImage,
      data: {
        notificationType: NotificationType.NEW_FOLLOWER,
      },
    } as NotificationData;

    await this.notificationService.sendNotification(followee, data);

    return this.followRepository.save(follow);
  }

  async unFollowUser(user: User, followeeId: number) {
    const follow = await this.followRepository.findOne({
      where: { follower: { id: user.id }, followee: { id: followeeId } },
    });

    if (!follow) {
      throw new NotFoundException("Follow relationship not found");
    }

    return await this.followRepository.remove(follow);
  }

  generateGetFollowersQuery(userId: number) {
    return this.followRepository
      .createQueryBuilder("follow")
      .leftJoinAndSelect("follow.follower", "follower")
      .leftJoinAndSelect("follower.followers", "followerFollowers")
      .where("follow.followee.id = :userId", { userId })
      .select(["follower.*"])
      .addSelect(subQuery => {
        return subQuery
          .select("COUNT(*)", "followerCount")
          .from(Follow, "followersOfFollower")
          .where("followersOfFollower.followee.id = follower.id");
      }, "followerCount")
      .groupBy("follower.id");
  }

  async getFollowers(userId: number, getAllData: GetAllDto) {
    const { page, perPage, search } = getAllData;

    let followersQuery = this.generateGetFollowersQuery(userId);

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const data = await paginateRaw<Follow>(followersQuery, paginationOptions);

    const sanitizedItems = data.items.map((each: any) => {
      const { password, ...rest } = each;
      return rest;
    });

    return {
      items: sanitizedItems,
      meta: data.meta,
    };
  }

  async getFollowing(userId: number, getAllData: GetAllDto) {
    const { page, perPage, role, search } = getAllData;

    let queryBuilder = this.followRepository
      .createQueryBuilder("follow")
      .leftJoinAndSelect("follow.follower", "follower") // you => the one who is following
      .leftJoinAndSelect("follow.followee", "followee") // to whom you are following
      .leftJoinAndSelect("follower.followers", "followerFollowers")
      .select(["followee.*"])
      .addSelect(subQuery => {
        return subQuery
          .select("COUNT(*)", "followerCount")
          .from(Follow, "followersOfFollowee")
          .where("followersOfFollowee.followee.id = followee.id");
      }, "followerCount")
      // Check if the current user is following this followee
      .addSelect(subQuery => {
        return subQuery
          .select("CASE WHEN COUNT(f) > 0 THEN true ELSE false END", "isFollowing")
          .from(Follow, "f")
          .where("f.follower.id = :currentUserId")
          .andWhere("f.followee.id = followee.id");
      }, "followed")
      .where("follow.follower.id = :userId", { userId })
      .andWhere("followee.activationStatus = :activeStatus", { activeStatus: ActivationStatus.ACTIVE }) // ** make sure only active followee returns
      .setParameter("currentUserId", userId)
      .distinct(true); // Pass the current user's ID

    if (role) {
      queryBuilder.andWhere("followee.role = :role", { role });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where("followee.name ILIKE :search", { search: `%${search}%` })
            .orWhere("followee.firstName ILIKE :search", { search: `%${search}%` })
            .orWhere("followee.lastName ILIKE :search", { search: `%${search}%` });
        }),
      );
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    if (role) {
      const data = await paginateRaw(queryBuilder, paginationOptions);
      const sanitizedItems = this.sanitize(data.items);
      return {
        [role]: sanitizedItems,
        meta: data.meta,
      };
    } else {
      const volunteers = await paginateRaw(
        queryBuilder.clone().andWhere("followee.role = :volunteerRole", { volunteerRole: UserRoles.VOLUNTEER }),
        paginationOptions,
      );
      const ngos = await paginateRaw(
        queryBuilder.clone().andWhere("followee.role = :ngoRole", { ngoRole: UserRoles.NGO }),
        paginationOptions,
      );
      const companies = await paginateRaw(
        queryBuilder.clone().andWhere("followee.role = :companyRole", { companyRole: UserRoles.COMPANY }),
        paginationOptions,
      );
      const sanitizedVolunteers = this.sanitize(volunteers.items);
      const sanitizedNgos = this.sanitize(ngos.items);
      const sanitizedCompanies = this.sanitize(companies.items);
      return {
        company: sanitizedCompanies,
        ngo: sanitizedNgos,
        volunteer: sanitizedVolunteers,
        meta: volunteers.meta,
      };
    }
  }

  sanitize(data: any) {
    return data?.map((each: any) => {
      const { password, ...rest } = each;
      return rest;
    });
  }
}
