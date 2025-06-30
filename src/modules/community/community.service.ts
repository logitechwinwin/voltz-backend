import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IPaginationOptions, paginateRaw } from "nestjs-typeorm-paginate";
import { Repository } from "typeorm";
import { NotificationData } from "../notification/interfaces/notification-data.interface";
import { NotificationService } from "../notification/notification.service";
import { S3Service } from "../s3/s3.service";
import { User, UserRoles } from "../user/user.entity";
import { CreateCommunityDto } from "./dto/create-community.dto";
import { GetAllCommunitiesDto } from "./dto/get-all-communities.dto";
import { UpdateCommunityDto } from "./dto/update-community.dto";
import { Community } from "./entities/community.entity";
import { CommunityS3Paths } from "src/static/s3-paths";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { ChangeActivationStatusDto } from "../event/dto/change-activation-status.dto";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";
import { ActivationStatus } from "src/shared/enums";

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,

    @InjectRepository(ActivationChangeLog)
    private activationChangeLogRepository: Repository<ActivationChangeLog>,

    private readonly s3Service: S3Service,

    private readonly notificationService: NotificationService,
  ) {}

  async create(createCommunityDto: CreateCommunityDto, user: User) {
    const bannerImage = await this.s3Service.uploadFile(createCommunityDto.bannerImage, CommunityS3Paths.BANNER_IMAGES);

    const community = this.communityRepository.create({
      ...createCommunityDto,
      bannerImage: bannerImage,
      createdBy: user,
    });

    return this.communityRepository.save(community);
  }

  async update(id: number, updateCommunityDto: UpdateCommunityDto, user: User) {
    const { bannerImage } = updateCommunityDto;

    const community = await this.communityRepository.findOne({
      where: {
        id,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!community) {
      throw new NotFoundException("Community doesn't exists");
    }

    Object.assign(community, updateCommunityDto);

    if (bannerImage) {
      community.bannerImage = await this.s3Service.uploadFile(bannerImage, CommunityS3Paths.BANNER_IMAGES);
    }

    return this.communityRepository.save(community);
  }

  async joinCommunity(id: number, user: User) {
    const { profileImage, firstName, lastName } = user;
    const community = await this.communityRepository
      .createQueryBuilder("community")
      .leftJoinAndSelect("community.members", "member")
      .leftJoinAndSelect("community.createdBy", "createdBy")
      .where("community.id = :id", { id })
      .andWhere("community.activationStatus = :active", { active: ActivationStatus.ACTIVE })
      .andWhere("community.createdBy.id != :userId", { userId: user.id })
      .select(["community", "member.id", "member.firstName", "createdBy"])
      .getOne();

    if (!community) {
      throw new NotFoundException("Community does not exists or you have already joined this community");
    }

    community.members.push(user);
    const data = {
      title: "New Member Joined Your Community!",
      message: `${firstName} ${lastName} has just joined your community, ${community.title}. Welcome them and help them get started! 🎉`,
      profileImage,
      bannerImage: "",
      data: {
        notificationType: NotificationType.NEW_MEMBER_JOINED_COMMUNITY,
        communityId: community.id,
      },
    } as NotificationData;

    await this.notificationService.sendNotification(community.createdBy, data);

    await this.communityRepository.save(community);
  }

  async unjoinCommunity(id: number, user: User) {
    const community = await this.communityRepository
      .createQueryBuilder("community")
      .leftJoinAndSelect("community.members", "member")
      .leftJoinAndSelect("community.createdBy", "createdBy")
      .where("community.id = :id", { id })
      .andWhere("community.activationStatus = :active", { active: ActivationStatus.ACTIVE })
      .andWhere("community.createdBy.id != :userId", { userId: user.id })
      .andWhere("member.id = :userId", { userId: user.id })
      .select(["community", "member.id", "member.firstName", "createdBy"])
      .getOne();

    if (!community) {
      throw new NotFoundException("Community does not exists, or you have not joined it");
    }

    // Remove the user from the community members
    await this.communityRepository.createQueryBuilder().relation(Community, "members").of(community).remove(user.id);
  }

  async findAll(getAllData: GetAllCommunitiesDto) {
    const {
      page,
      perPage,
      search,
      myCommunities,
      joinedCommunities,
      userId: userIdFromQuery,
      notJoinedCommunities,
      activationStatus,
    } = getAllData;

    const queryBuilder = this.communityRepository
      .createQueryBuilder("community")
      .leftJoin("community.members", "member")
      .leftJoin("community.createdBy", "createdBy")
      .select([
        "community.id",
        "community.description",
        "community.title",
        "community.bannerImage",
        "community.createdAt",
        "community.updatedAt",
        "createdBy.id",
        "createdBy.firstName",
        "createdBy.lastName",
        "createdBy.name",
        "createdBy.role",
        "COALESCE(BOOL_OR(member.id = :userId), false) AS isJoined", // Check if the current user is a member
        "COUNT(member.id) AS totalMembers", // Get total member count
        "COALESCE(json_agg(json_build_object('id', member.id, 'firstName', member.firstName, 'lastName', member.lastName, 'profileImage', member.profileImage) ORDER BY member.id DESC) FILTER (WHERE member.id IS NOT NULL), '[]') AS members", // Use COALESCE to return an empty array if no members
      ])
      .groupBy("community.id")
      .addGroupBy("createdBy.id")
      .setParameters({ userId: userIdFromQuery || null })
      .orderBy("community.updatedAt");

    if (activationStatus) {
      queryBuilder.andWhere("community.activationStatus = :activationStatus", { activationStatus });
    }

    if (userIdFromQuery && myCommunities) {
      queryBuilder.andWhere("createdBy.id = :userId", { userId: userIdFromQuery });
    }

    if (userIdFromQuery && joinedCommunities) {
      queryBuilder.having(`BOOL_OR(member.id = :userId) = :isJoined`, { isJoined: true });
    }

    // Filter by communities the user has not joined or created
    if (userIdFromQuery && notJoinedCommunities) {
      queryBuilder.having(`BOOL_AND(member.id IS DISTINCT FROM :userId) AND (createdBy.id != :userId)`, {
        userId: userIdFromQuery,
      });
    }

    // Adding search functionality
    if (search) {
      queryBuilder.andWhere("community.title ILIKE :search", { search: `%${search}%` });
    }

    queryBuilder.andWhere("community.deletedAt IS NULL").orderBy("community.createdAt", "DESC");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const rawResults = await paginateRaw(queryBuilder, paginationOptions);

    // Format the result to include only the top 3 members
    const formattedResults = rawResults.items.map((community: any) => this.communityResponse(community));

    return {
      communities: formattedResults,
      meta: rawResults.meta,
    };
  }

  async getOne(id: number, user: User) {
    const community = await this.communityRepository
      .createQueryBuilder("community")
      .leftJoin("community.members", "member")
      .leftJoin("community.createdBy", "createdBy")
      .select([
        "community.id",
        "community.description",
        "community.title",
        "community.bannerImage",
        "community.createdAt",
        "community.updatedAt",
        "createdBy.id",
        "createdBy.firstName",
        "createdBy.lastName",
        "createdBy.name",
        "createdBy.role",
        "COUNT(member.id) AS totalMembers", // Get total member count
        "COALESCE(BOOL_OR(member.id = :userId), false) AS isJoined", // Check if the current user is a member
        "COALESCE(json_agg(json_build_object('id', member.id, 'firstName', member.firstName, 'lastName', member.lastName, 'profileImage', member.profileImage) ORDER BY member.id DESC) FILTER (WHERE member.id IS NOT NULL), '[]') AS members", // Use COALESCE to return an empty array if no members
      ])
      .where("community.id = :communityId", { communityId: id })
      .andWhere("community.activationStatus = :activeStatus", { activeStatus: ActivationStatus.ACTIVE })
      .groupBy("community.id")
      .addGroupBy("createdBy.id")
      .setParameters({ userId: user?.id || null })
      .getRawOne();

    if (!community) {
      throw new NotFoundException("Community not found");
    }

    return this.communityResponse(community);
  }

  async changeActivationStatus(
    communityId: number,
    currentUser: User,
    changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    const community = await this.communityRepository.findOne({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException("community does not exists");
    }

    if (community.activationStatus === changeActivationStatusDto.status) {
      throw new BadRequestException(`Community is already ${community.activationStatus}`);
    }

    community.activationStatus = changeActivationStatusDto.status;
    await this.communityRepository.save(community);

    const activationChangeLog = this.activationChangeLogRepository.create({
      community: community,
      admin: currentUser,
      reason: changeActivationStatusDto.reason,
      status: changeActivationStatusDto.status,
    });

    await this.activationChangeLogRepository.save(activationChangeLog);
  }

  remove(id: number) {
    return `This action removes a #${id} community`;
  }

  communityResponse(community: any) {
    return {
      id: community.community_id,
      title: community.community_title,
      description: community.community_description,
      bannerImage: community.community_bannerImage,
      createdAt: community.community_createdAt,
      updatedAt: community.community_updatedAt,
      createdBy: {
        id: community.createdBy_id,
        name:
          community.createdBy_role === UserRoles.NGO
            ? community.createdBy_name
            : `${community.createdBy_firstName} ${community.createdBy_lastName}`,
        role: community.createdBy_role,
      },
      // - (community?.members?.length > 3 ? 3 : community?.members?.length), // Convert to number
      totalMembers: +community.totalmembers,
      isJoined: community.isjoined, // Boolean indicating membership
      topMembers: community.members ? community.members.slice(0, 3) : [], // Take the top 3 members
    };
  }
}
