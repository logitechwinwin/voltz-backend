import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as moment from "moment";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { Brackets, In, IsNull, Repository } from "typeorm";
import { Donation, DonationStatuses } from "../donation/entities/donation.entity";
import { Follow } from "../follow/entities/follow.entity";
import { LifeStage } from "../life-stage/entities/life-stage.entity";
import { S3Service } from "../s3/s3.service";
import { Sdg } from "../sdg/entities/sdg.entity";
import { Topic } from "../topic/entities/topic.entity";
import { VolunteerRequest, VolunteerRequestStatus } from "../volunteer-request/entities/volunteer-request.entity";
import { AddDeviceTokenDto } from "./dtos/add-device-token.dto";
import { GetUsersSdgsStats, StatsDuration } from "./dtos/get-user-sdgs-stats.dto";
import { FilterStatus, GetVoltzHistoryStatsDto } from "./dtos/get-voltz-history-stats.dto";
import { SetUserInterestDto } from "./dtos/set-user-interests.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { InterestedLocation } from "./interested-location.entity";
import { User, UserRoles } from "./user.entity";
import { UserS3Paths } from "src/static/s3-paths";
import { WalletTransactionStatus, WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { ActivationStatus } from "src/shared/enums";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,

    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,

    @InjectRepository(VolunteerRequest)
    private readonly volunteerRequestRepository: Repository<VolunteerRequest>,

    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,

    @InjectRepository(LifeStage)
    private readonly lifeStageRepository: Repository<LifeStage>,

    @InjectRepository(InterestedLocation)
    private readonly interestedLocationRepository: Repository<InterestedLocation>,

    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,

    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,

    private readonly s3Service: S3Service,
  ) {}

  async getVoltzHistoryStats(user: User, getVoltzHistoryStatsDto: GetVoltzHistoryStatsDto) {
    const { page, perPage, status } = getVoltzHistoryStatsDto;

    // 1. Calculate earned voltz
    const totalEarned = await this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .select("SUM(walletTransaction.amount)", "earned")
      .where(`"walletTransaction"."targetWalletId" = :currentUserWalletId`, { currentUserWalletId: user.wallet.id })
      .andWhere("walletTransaction.status = :transactionStatus", {
        transactionStatus: WalletTransactionStatus.RELEASED,
      })
      .getRawOne();

    // 2. Calculate spent voltz
    const totalSpent = await this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .select("SUM(walletTransaction.amount)", "spent")
      .where("walletTransaction.sourceWalletId = :currentUserWalletId", { currentUserWalletId: user.wallet.id })
      .andWhere("walletTransaction.status != :transactionStatus", {
        transactionStatus: WalletTransactionStatus.CANCELLED,
      })
      .getRawOne();

    // 3. Calculate available voltz
    const availableVoltz = (totalEarned.earned || 0) - (totalSpent.spent || 0);

    // 4. Fetch transaction history with pagination
    const queryBuilder = this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .leftJoinAndSelect("walletTransaction.sourceWallet", "sourceWallet")
      .leftJoinAndSelect("walletTransaction.targetWallet", "targetWallet")
      .leftJoinAndSelect("sourceWallet.user", "sourceWalletOwner")
      .leftJoinAndSelect("targetWallet.user", "targetWalletOwner")
      .leftJoinAndSelect("walletTransaction.deal", "deal")
      .leftJoinAndSelect("walletTransaction.event", "event")
      .leftJoinAndSelect("walletTransaction.campaignManager", "campaignManager");

    // Apply status if provided
    if (status === FilterStatus.EARNED) {
      queryBuilder.where("targetWallet.id= :currentUserWalletId", { currentUserWalletId: user.wallet.id });
    } else if (status === FilterStatus.SPENT) {
      queryBuilder.where("sourceWallet.id= :currentUserWalletId", { currentUserWalletId: user.wallet.id });
    } else {
      queryBuilder
        .where(
          new Brackets(qb => {
            qb.where("targetWallet.id = :currentUserWalletId", { currentUserWalletId: user.wallet.id });
          }),
        )
        .orWhere(
          new Brackets(qb => {
            qb.where("sourceWallet.id = :currentUserWalletId", { currentUserWalletId: user.wallet.id });
          }),
        );
    }

    queryBuilder.orderBy("walletTransaction.createdAt", "DESC");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const history = await paginate<WalletTransaction>(queryBuilder, paginationOptions);

    return {
      message: "Stats fetched successfully",
      details: {
        voltz: {
          earned: totalEarned.earned || 0,
          spent: totalSpent.spent || 0,
          available: availableVoltz || 0,
        },
        history: history.items,
        meta: {
          totalItems: history.meta.totalItems,
          itemCount: history.meta.itemCount,
          itemsPerPage: history.meta.itemsPerPage,
          totalPages: history.meta.totalPages,
          currentPage: history.meta.currentPage,
        },
      },
    };
  }

  async getGoalsAchieved(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId, deletedAt: null },
      relations: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const totalVoltzEarned = await this.walletTransactionRepository
      .createQueryBuilder("targetWallet")
      .select("SUM(targetWallet.amount)", "earned")
      .where("targetWallet.targetWalletId = :walletId", { walletId: user.wallet.id })
      .andWhere("targetWallet.status = :transactionStatus", { transactionStatus: WalletTransactionStatus.RELEASED })
      .getRawOne();

    const totalDonation = await this.donationRepository
      .createQueryBuilder("donation")
      .leftJoinAndSelect("donation.user", "donator")
      .select("SUM(donation.amount)", "donatedAmount")
      .where("donator.id = :userId", { userId: userId })
      .andWhere("donation.status = :donationCompleted", { donationCompleted: DonationStatuses.COMPLETED })
      .getRawOne();

    const userData = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.sdgs", "sdgs") // automatically selects all fields
      .where("user.id = :userId", { userId })
      .getOne();

    const totalEventsParticipated = await this.volunteerRequestRepository
      .createQueryBuilder("volunteerRequest")
      .leftJoinAndSelect("volunteerRequest.user", "user")
      .where("user.id = :userId", { userId: userId })
      .andWhere("volunteerRequest.status = :acceptedStatus", { acceptedStatus: VolunteerRequestStatus.ACCEPTED })
      .getCount();

    const followingsCount = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.following", "following") // the following object
      .leftJoinAndSelect("following.followee", "usersWhomIAmFollowing") // ** the actual user the ones you are following
      .where("user.id = :currentUserId", { currentUserId: userId })
      .andWhere(`"usersWhomIAmFollowing"."activationStatus" = :activeStatus`, { activeStatus: ActivationStatus.ACTIVE })
      .select("COUNT(following.id)", "followingCount")
      .getRawOne();

    const followersCount = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.followers", "followers")
      .leftJoinAndSelect("followers.follower", "usersWhoAreFollowingMe")
      .where("user.id = :currentUserId", { currentUserId: userId })
      .andWhere(`"usersWhoAreFollowingMe"."activationStatus" = :activeStatus`, {
        activeStatus: ActivationStatus.ACTIVE,
      })
      .select("COUNT(followers.id)", "followersCount")
      .getRawOne();

    return {
      voltzEarned: totalVoltzEarned.earned || 0,
      donatedAmount: totalDonation.donatedAmount || 0,
      sdgs: userData.sdgs,
      totalEventsParticipated,
      ...followersCount,
      ...followingsCount,
    };
  }

  async getVolunteerSdgStats(getUsersSdgsStats: GetUsersSdgsStats) {
    const { userId, duration } = getUsersSdgsStats;

    // ** find user with his sdgs
    const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ["sdgs"] });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    let startDate: moment.Moment;

    switch (duration) {
      case StatsDuration["1M"]:
        startDate = moment().subtract(1, "months").startOf("day");
        break;
      case StatsDuration["3M"]:
        startDate = moment().subtract(3, "months").startOf("day");
        break;
      case StatsDuration["6M"]:
        startDate = moment().subtract(6, "months").startOf("day");
        break;
      case StatsDuration["1Y"]:
        startDate = moment().subtract(1, "years").startOf("day");
        break;
    }

    const endDate = moment().endOf("day");

    // Fetch participation in events that align with the selected SDGs
    const sdgStats = await Promise.all(
      user.sdgs?.map(async sdg => {
        const query = this.volunteerRequestRepository
          .createQueryBuilder("request")
          .innerJoin("request.event", "event")
          .innerJoin("event.sdgs", "sdg")
          .where("request.userId = :userId", { userId })
          .andWhere("sdg.id = :sdgId", { sdgId: sdg.id })
          .andWhere("request.status = :requestStatus", { requestStatus: VolunteerRequestStatus.ACCEPTED })
          .select("SUM(request.actualHours)", "totalHours");

        if (duration !== StatsDuration.ALL) {
          query.andWhere("request.createdAt BETWEEN :startDate AND :endDate", {
            startDate: startDate.toDate(),
            endDate: endDate.toDate(),
          });
        }

        const participation = await query.getRawOne();

        return {
          sdg,
          totalHours: participation.totalHours || 0,
        } as { sdg: any; totalHours: number; percentage: any };
      }),
    );
    // Calculate the total hours worked across all SDGs
    const totalHoursWorked = sdgStats?.reduce((acc, curr) => acc + curr.totalHours, 0);

    // Calculate the percentage for each SDG and add it to the result
    sdgStats?.forEach(stat => {
      stat.percentage = totalHoursWorked > 0 ? parseFloat(((stat.totalHours / totalHoursWorked) * 100).toFixed(2)) : 0;
    });

    // Sort the SDGs by totalHours in descending order
    sdgStats.sort((a, b) => b.totalHours - a.totalHours);

    return {
      sdgStats,
      totalHoursWorked, // Include this if you want to display the overall total as well
    };
  }

  async get(userId: number, authenticatedUser: User) {
    let user = await this.usersRepository.findOne({
      where: {
        id: userId,
        ...((!authenticatedUser || authenticatedUser.role === UserRoles.VOLUNTEER) && {
          activationStatus: ActivationStatus.ACTIVE,
        }), // make sure user doesn't find in_active user
      },
    });

    if (!user) {
      throw new NotFoundException("Users not found");
    }

    let isFollowed: Follow;
    if (authenticatedUser) {
      isFollowed = await this.followRepository.findOne({
        where: {
          follower: { id: authenticatedUser.id },
          followee: { id: user.id },
        },
      });
    }

    return { ...user, isFollowed: isFollowed ? true : false };
  }

  async getVolunteerProfile(user: User) {
    const volunteer = await this.usersRepository.findOne({
      where: {
        id: user.id,
        role: UserRoles.VOLUNTEER,
        deletedAt: IsNull(),
      },
    });

    if (!volunteer) {
      throw new BadRequestException("Volunteer profile not found");
    }

    return { volunteer };
  }

  async setUserInterest(setUserInterests: SetUserInterestDto, user: User) {
    const { topics, lifeStages, locations } = setUserInterests;

    const locationsData = this.interestedLocationRepository.create(
      locations.map(location => ({
        ...location,
        user: user,
      })),
    );

    const locationEntries = await this.interestedLocationRepository.save(locationsData);

    const topicEntities = await this.topicsRepository.findBy({
      id: In(topics),
      deletedAt: IsNull(),
    });

    const lifeStageEntities = await this.lifeStageRepository.findBy({
      id: In(lifeStages),
      deletedAt: IsNull(),
    });

    user.topics = topicEntities;
    user.lifeStages = lifeStageEntities;
    user.interestedLocations = locationEntries;

    await this.usersRepository.save(user);
  }

  async updateUser(user: User, userUpdateData: UpdateUserDto) {
    const userId = user.id;
    const { _requestContext, sdgs: sdgIds, ...updateFields } = userUpdateData;

    const sdgs = sdgIds?.map(sdgId => Object.assign(new Sdg(), { id: sdgId }));

    const userEntity = await this.usersRepository.findOne({
      where: { id: userId },
      relations: {
        topics: true,
        sdgs: true,
        lifeStages: true,
        interestedLocations: true,
      },
    });

    const updatedUserData = {
      ...updateFields,
      ...(sdgIds?.length && { sdgs }),
      ...(updateFields.profileImage && {
        profileImage: await this.s3Service.uploadFile(updateFields.profileImage, UserS3Paths.PROFILE_IMAGE),
      }),
      ...(updateFields.bannerImage && {
        bannerImage: await this.s3Service.uploadFile(updateFields.bannerImage, UserS3Paths.BANNER_IMAGE),
      }),
    };

    const makeDateForUpdate = Object.assign(userEntity, updatedUserData);
    const savedUser = await this.usersRepository.save(makeDateForUpdate);

    const updatedUser = await this.usersRepository.findOne({
      where: { id: userId },
      relations: {
        topics: true,
        sdgs: true,
        lifeStages: true,
        interestedLocations: true,
      },
    });

    if (!savedUser) {
      throw new BadRequestException("User not found");
    }
    delete savedUser.password;
    return { savedUser: updatedUser };
  }

  async addDeviceToken(currentLoginAttempt: LoginAttempt, addDeviceTokenDto: AddDeviceTokenDto) {
    currentLoginAttempt.fcmDeviceToken = addDeviceTokenDto.deviceToken;
    await this.loginAttemptRepository.save(currentLoginAttempt);
  }
}
