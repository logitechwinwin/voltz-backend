import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import * as moment from "moment";
import { PaymentService } from "src/shared/services/payment.service";
import { removeTablePrefix } from "src/utils/remove-table-prefix";
import { Brackets, DataSource, QueryRunner, Repository } from "typeorm";
import { Donation, DonationStatuses } from "../donation/entities/donation.entity";
import { Event, EventType } from "../event/entities/event.entity";
import { S3Service } from "../s3/s3.service";
import { Sdg } from "../sdg/entities/sdg.entity";
import { RegistrationStatus, User, UserRoles } from "../user/user.entity";
import { VolunteerRequest, VolunteerRequestStatus } from "../volunteer-request/entities/volunteer-request.entity";
import { CreateNgoDto } from "./dto/create-ngo.dto";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { UpdateNgoDto } from "./dto/update-ngo.dto";
import { PaymentIntent, PaymentIntentStatus } from "../../shared/entities/payment-intent.entity";
import { UserS3Paths } from "src/static/s3-paths";
import { WalletTransactionService } from "../wallet-transaction/wallet-transaction.service";
import {
  WalletTransactionStatus,
  WalletTransaction,
  WalletTransactionTypes,
} from "../wallet-transaction/entities/wallet-transaction.entity";
import { WalletService } from "../wallet/wallet.service";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { GetAllNgoDto } from "./dto/get-all-ngo.dto";
import { ActivationStatus } from "src/shared/enums";

@Injectable()
export class NgoService {
  private oneVoltzEqaulTo: string;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(PaymentIntent)
    private readonly paymentIntentRepository: Repository<PaymentIntent>,

    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,

    @InjectRepository(VolunteerRequest)
    private readonly volunteerRequestRepository: Repository<VolunteerRequest>,

    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,

    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,

    @InjectDataSource()
    public readonly dataSource: DataSource,

    private readonly s3Service: S3Service,

    private readonly paymentService: PaymentService,

    private readonly configService: ConfigService,

    private readonly walletTransactionService: WalletTransactionService,

    private readonly notificationService: NotificationService,

    private readonly walletService: WalletService,
  ) {
    this.oneVoltzEqaulTo = this.configService.get("oneVoltzEqaulTo");
  }

  create(createNgoDto: CreateNgoDto) {
    return "This action adds a new ngo";
  }

  async initiatePayment(user: User, initiatePaymentData: InitiatePaymentDto, req: Request) {
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();

    // Start the transaction
    await queryRunner.startTransaction();

    try {
      const paymentIntent = queryRunner.manager.create(this.paymentIntentRepository.target, {
        user: user,
        voltzRequested: initiatePaymentData.voltzRequested,
        amount: Number(this.oneVoltzEqaulTo) * initiatePaymentData.voltzRequested,
        currency: "USD",
        status: PaymentIntentStatus.PENDING,
      });

      const formUrl = await this.paymentService.createPayment({
        productInfo: { unitCost: paymentIntent.amount },
        billingInfo: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
        userId: user.id,
        redirectUrl: initiatePaymentData.redirectUrl,
        req: req,
      });

      paymentIntent.onlineToken = formUrl.split("/")[6];
      await queryRunner.manager.save(paymentIntent);

      // Commit the transaction
      await queryRunner.commitTransaction();

      return formUrl;
    } catch (error) {
      // Rollback the transaction in case of an error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async verifyPayment(user: User, tokenId: string) {
    const connection = this.dataSource;
    const queryRunner: QueryRunner = connection.createQueryRunner();

    await queryRunner.startTransaction();

    try {
      const paymentIntent = await queryRunner.manager.findOne(this.paymentIntentRepository.target, {
        where: { user: { id: user.id }, onlineToken: tokenId, status: PaymentIntentStatus.PENDING },
        relations: { user: { wallet: true } },
      });

      if (!paymentIntent) {
        throw new NotFoundException("Payment intent not found or already processed");
      }

      await this.paymentService.verifyPayment(tokenId);

      await this.walletService.addVoltzToWalletWithPurchase({
        targetWallet: paymentIntent.user.wallet,
        amount: paymentIntent.voltzRequested,
        description: `voltz purchased by ngo`,
      });

      paymentIntent.status = PaymentIntentStatus.COMPLETED;

      await queryRunner.manager.save(paymentIntent);

      const admins = await this.usersRepository.find({
        where: { role: UserRoles.ADMIN },
      });

      await this.notificationService.sendNotificationToMultipleUsers(
        admins.map(admin => admin.id),
        {
          title: "New Voltz Purchase",
          message: `Voltz purchase has been made by ${paymentIntent.user.name} ngo`,
          profileImage: paymentIntent.user.profileImage,
          bannerImage: paymentIntent.user.bannerImage,
          data: {
            notificationType: NotificationType.VOLTZ_PURCHASED_BY_NGO,
          },
        },
      );

      // Commit the transaction
      await queryRunner.commitTransaction();

      return paymentIntent;
    } catch (error) {
      // Rollback the transaction in case of an error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /// voltzs purchasing flow

  findAll() {
    return `This action returns all ngo`;
  }

  async findTopLocations() {
    const rawDistinctData = await this.usersRepository
      .createQueryBuilder("user")
      .where("user.role = :role", { role: "ngo" })
      .andWhere("user.registrationStatus = :status", { status: RegistrationStatus.APPROVED })
      .select(["user.city", "user.country", "user.state"])
      .distinct(true)
      .limit(10)
      .getRawMany();

    // Transform the raw data to the desired format

    return removeTablePrefix(rawDistinctData, "user");
  }

  async getAll(currentUser: User, queryData: GetAllNgoDto) {
    let { page, perPage, search, location, byUserInterest, sdgs, userId, exceedFollowed, activationStatus } = queryData;

    // ** making sure activation status is always active for any other user then admin (as admin can get inactive ngos as well)
    if (!currentUser || currentUser.role !== UserRoles.ADMIN) {
      activationStatus = ActivationStatus.ACTIVE;
    }

    const offset = (page - 1) * perPage;

    const baseQuery = this.usersRepository
      .createQueryBuilder("user")
      .leftJoin("user.followers", "followers")
      .addSelect([
        "COUNT(followers.id) AS user_followerCount",
        // `(CASE WHEN COUNT(followers.id) > 0 AND COUNT(followers.id)  ) > 0 THEN true ELSE false END) AS followed`,
        `(CASE 
        WHEN COUNT(followers.id) > 0 
          AND COUNT(followers.id) FILTER (WHERE followers.follower = :givenUserId) > 0 
        THEN true 
        ELSE false 
      END) AS followed`,
      ])
      .where("user.role = :role", { role: UserRoles.NGO })
      .andWhere("user.registrationStatus = :registrationStatus", { registrationStatus: RegistrationStatus.APPROVED })
      .groupBy("user.id")
      .setParameter("givenUserId", userId);

    if (activationStatus) {
      baseQuery.andWhere("user.activationStatus = :activationStatus", { activationStatus });
    }

    if (search) {
      baseQuery.andWhere(`(user.name ILIKE :search OR user.email ILIKE :search OR user.regNumber ILIKE :search)`, {
        search: `%${search}%`,
      });
    }

    if (location) {
      baseQuery.andWhere(
        new Brackets(qb => {
          qb.where("user.city ILIKE :search", { search: `%${location}%` })
            .orWhere("user.state ILIKE :search", { search: `%${location}%` })
            .orWhere("user.country ILIKE :search", { search: `%${location}%` });
        }),
      );
    }

    if (sdgs?.length) {
      baseQuery.innerJoin("user.sdgs", "sdg").andWhere("sdg.id IN (:...sdgs)", { sdgs });
    }

    if (userId && !!exceedFollowed) {
      baseQuery.andWhere(
        `user.id NOT IN (SELECT "follow"."followeeId" FROM "follow" WHERE "follow"."followerId" = :userId)`,
        { userId },
      );
    }

    let results = [];
    let totalItems = 0;

    if (userId && byUserInterest) {
      const { cities, states, countries, interestedLocations } = await this.getUserInterestedLocations(userId);

      const userInterestQuery = baseQuery.clone();

      if (interestedLocations?.length) {
        userInterestQuery.andWhere(
          new Brackets(qb => {
            qb.where("user.city IN (:...cities)", { cities })
              .orWhere("user.state IN (:...states)", { states })
              .orWhere("user.country IN (:...countries)", { countries });
          }),
        );
      }

      const userInterestResults = await userInterestQuery.limit(perPage).offset(offset).getRawMany();
      totalItems = await userInterestQuery.getCount();

      if (userInterestResults.length < perPage) {
        // if (userInterestResults.length)
        //   baseQuery.andWhere("user.id NOT IN (:...filteredEventIds)", {
        //     filteredEventIds: userInterestResults.map(event => event.id),
        //   });

        baseQuery.limit(perPage - userInterestResults.length).offset(offset);
        const generalResults = await baseQuery.getRawMany();
        results = [...userInterestResults, ...generalResults];
        totalItems += await baseQuery.getCount();
      } else {
        results = userInterestResults;
      }
    } else {
      baseQuery.limit(perPage).offset(offset);
      results = await baseQuery.getRawMany();
      totalItems = await baseQuery.getCount();
    }

    const totalPages = Math.ceil(totalItems / perPage);
    const itemCount = results.length;

    return {
      items: removeTablePrefix(results, "user"),
      meta: {
        totalItems,
        itemCount,
        itemsPerPage: perPage,
        totalPages,
        currentPage: page,
      },
    };
  }

  async get(ngoId: number, user: User) {
    // Step 1: Fetch the user data along with the related entities
    const userData = await this.usersRepository.findOne({
      where: {
        id: ngoId,
        role: UserRoles.NGO,
        ...((!user || user.role === UserRoles.VOLUNTEER) && {
          activationStatus: ActivationStatus.ACTIVE,
        }),
      },
      relations: {
        topics: true,
        lifeStages: true,
        interestedLocations: true,
      },
    });

    // Ensure the user exists
    if (!userData) {
      throw new NotFoundException("User not found");
    }

    // Step 2: Fetch follower count and followed status

    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .leftJoin("user.followers", "followers")
      .addSelect("COUNT(followers.id) AS user_followerCount")
      .groupBy("user.id")
      .where("user.id = :ngoId", { ngoId });

    // Check if user.id is available to add the "followed" condition
    if (user?.id) {
      queryBuilder
        .addSelect(
          `
      (CASE 
        WHEN COUNT(followers.id) > 0 
          AND COUNT(followers.id) FILTER (WHERE followers.follower = :givenUserId) > 0 
        THEN true 
        ELSE false 
      END) AS followed
    `,
        )
        .setParameter("givenUserId", user.id);
    }

    const followerData = await queryBuilder.getRawOne();

    // Step 3: Merge the subquery result with the main user data
    const result = {
      ...userData,
      followerCount: followerData.user_followercount,
      followed: followerData.followed || false, // Default to false if 'followed' is not part of the result
    };
    return result;
  }

  async update(user: User, updateData: UpdateNgoDto) {
    const userId = user.id;
    const { _requestContext, sdgs: sdgIds, ...updateFields } = updateData;

    const sdgs = sdgIds?.map(sdgId => Object.assign(new Sdg(), { id: sdgId }));

    const userEntity = await this.usersRepository.findOne({
      where: { id: userId },
      relations: {
        sdgs: true,
      },
    });

    const profileImage = await this.s3Service.uploadFile(updateFields.profileImage, UserS3Paths.PROFILE_IMAGE);
    const bannerImage = await this.s3Service.uploadFile(updateFields.bannerImage, UserS3Paths.BANNER_IMAGE);
    const certificateOfReg = await this.s3Service.uploadFile(updateFields.certificateOfReg, UserS3Paths.CSR_POLICY_DOC);

    const updatedUserData = {
      ...updateFields,
      sdgs,
      ...(updateFields.profileImage && {
        profileImage,
      }),
      ...(updateFields.bannerImage && {
        bannerImage,
      }),
      ...(updateFields.certificateOfReg && {
        certificateOfReg,
      }),
    };

    const makeDateForUpdate = Object.assign(userEntity, updatedUserData);
    const savedUser = await this.usersRepository.save(makeDateForUpdate);

    if (!savedUser) {
      throw new BadRequestException("User not found");
    }

    return { savedUser };
  }

  async getUserInterestedLocations(userId: number) {
    const { interestedLocations } = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.topics", "topics")
      .leftJoinAndSelect("user.lifeStages", "lifeStages")
      .leftJoinAndSelect("user.interestedLocations", "interestedLocations")
      .where("user.id = :userId", { userId })
      .getOne();

    const cities = interestedLocations.map(each => each.city);
    const states = interestedLocations.map(each => each.state);
    const countries = interestedLocations.map(each => each.country);
    return { cities, states, countries, interestedLocations };
  }

  async getDashboardStats(ngoId: number, currentUser: User) {
    // ** ngo can only see his stats, admin can see any ngo's stats
    if (currentUser.role === UserRoles.NGO && ngoId !== currentUser.id) {
      throw new ForbiddenException("You don't have access for this statistics");
    }

    const user = await this.usersRepository.findOne({
      where: { id: ngoId, role: UserRoles.NGO },
      relations: {
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Ngo not found");
    }

    const eventStats = await this.eventRepository
      .createQueryBuilder("event")
      .select([
        `(SELECT COUNT(*) FROM event WHERE event.userId = :userId) AS "totalEvents"`,
        `(SELECT COUNT(*) FROM event 
          WHERE event.userId = :userId 
          AND event.startDate <= :today 
          AND (event.endDate IS NULL OR event.endDate > :today)
        ) AS "runningEvents"`,
        `(SELECT COUNT(*) FROM event 
          WHERE event.userId = :userId 
          AND event.startDate > :today
        ) AS "upcomingEvents"`,
      ])
      .setParameters({ userId: user.id, today: new Date() })
      .getRawOne();

    const voltzStats = await this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .select([
        `SUM(CASE WHEN walletTransaction.sourceWalletId = :userWalletId THEN walletTransaction.amount END) AS "totalGiven"`,
        `SUM(CASE WHEN walletTransaction.targetWalletId = :userWalletId AND walletTransaction.type = :purchase THEN walletTransaction.amount END) AS "totalVoltzPurchased"`,
      ])
      .where("walletTransaction.status = :status", { status: WalletTransactionStatus.RELEASED })
      .setParameters({
        userWalletId: user.wallet.id,
        purchase: WalletTransactionTypes.PURCHASE,
      })
      .getRawOne();

    const donationStats = await this.donationRepository
      .createQueryBuilder("donation")
      .leftJoin("donation.event", "event")
      .select("SUM(donation.amount)", "totalDonationRaised")
      .where("event.userId = :eventCreatorId", { eventCreatorId: user.id })
      .andWhere("donation.status = :status", { status: DonationStatuses.COMPLETED })
      .getRawOne();

    const volunteerRequestStats = await this.volunteerRequestRepository
      .createQueryBuilder("volunteerRequest")
      .leftJoin("volunteerRequest.event", "event")
      .leftJoin("event.user", "eventCreator")
      .where("eventCreator.id = :createId", { createId: user.id })
      .select([
        `COUNT(volunteerRequest.id) AS "totalVolunteerRequests"`,
        `SUM(CASE WHEN volunteerRequest.status = :pending THEN 1 ELSE 0 END) AS "pendingVolunteerRequests"`,
        `SUM(CASE WHEN volunteerRequest.status = :rejected THEN 1 ELSE 0 END) AS "rejectedVolunteerRequests"`,
        `SUM(CASE WHEN volunteerRequest.status = :accepted THEN 1 ELSE 0 END) AS "acceptedVolunteerRequests"`,
      ])
      .setParameters({
        pending: VolunteerRequestStatus.PENDING,
        accepted: VolunteerRequestStatus.ACCEPTED,
        rejected: VolunteerRequestStatus.REJECTED,
      })
      .getRawOne();

    const startOfMonth = moment().startOf("M").toDate();
    const endOfMonth = moment().endOf("M").toDate();

    const top3Charities = await this.donationRepository
      .createQueryBuilder("donation")
      .leftJoinAndSelect("donation.event", "event")
      .leftJoinAndSelect("event.user", "eventCreator")
      .select("event.title", "title")
      .addSelect("event.id", "eventId")
      .addSelect("SUM(donation.amount)", "charityRaised")
      .addSelect("COUNT(donation.id)", "donationCount")
      .where("event.type = :eventType", { eventType: EventType.CHARITY })
      .andWhere("eventCreator.id = :ngoId", { ngoId: user.id })
      .andWhere("donation.status = :donationStatus", { donationStatus: DonationStatuses.COMPLETED })
      .andWhere(`donation.donatedAt BETWEEN :startOfMonth AND :endOfMonth`, { startOfMonth, endOfMonth })
      .orderBy(`"charityRaised"`, "DESC")
      .addOrderBy(`"donationCount"`, "DESC")
      .groupBy("event.id")
      .limit(3)
      .getRawMany();

    const top3Campaigns = await this.eventRepository
      .createQueryBuilder("event")
      .select("event.id", "eventId")
      .addSelect("event.title", "title")
      .addSelect(
        // Subquery for volunteerParticipated
        qb =>
          qb
            .subQuery()
            .select(
              "COALESCE(SUM(CASE WHEN vr.status = :acceptedStatus THEN 1 ELSE 0 END), 0)",
              "volunteerParticipated",
            )
            .from("volunteer_request", "vr")
            .where("vr.eventId = event.id"),
        "volunteerParticipated",
      )
      .addSelect(
        // Subquery for voltzUsed
        qb =>
          qb
            .subQuery()
            .select(
              "COALESCE(SUM(CASE WHEN vr.status = :acceptedStatus THEN vr.actualHours * event.voltzPerHour ELSE 0 END), 0)",
              "voltzUsed",
            )
            .from("volunteer_request", "vr")
            .where("vr.eventId = event.id"),
        "voltzUsed",
      )
      .addSelect(
        // Subquery for charityRaised
        qb =>
          qb
            .subQuery()
            .select(
              "COALESCE(SUM(CASE WHEN donation.status = :completedStatus THEN donation.amount ELSE 0 END), 0)",
              "charityRaised",
            )
            .from("donation", "donation")
            .where("donation.eventId = event.id")
            .andWhere("donation.donatedAt BETWEEN :startOfMonth AND :endOfMonth"),
        "charityRaised",
      )
      .where("event.type = :eventType", { eventType: EventType.CAMPAIGN })
      .andWhere("event.userId = :ngoId", { ngoId: user.id })
      .orderBy(`"volunteerParticipated"`, "DESC")
      .limit(3)
      .setParameter("acceptedStatus", VolunteerRequestStatus.ACCEPTED)
      .setParameter("completedStatus", DonationStatuses.COMPLETED)
      .setParameter("startOfMonth", startOfMonth)
      .setParameter("endOfMonth", endOfMonth)
      .getRawMany();

    return {
      top3Charities,
      top3Campaigns,
      ...volunteerRequestStats,
      ...donationStats,
      ...voltzStats,
      ...eventStats,
    };
  }
}
