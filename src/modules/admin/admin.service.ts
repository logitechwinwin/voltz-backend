import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import { RegistrationStatus, User, UserRoles } from "../user/user.entity";
import { Brackets, In, IsNull, Not, QueryRunner, Repository } from "typeorm";
import { ApproveUserKycDto } from "./dto/approve-user-kyc.dto";
import { JwtService } from "@nestjs/jwt";
import { MailsService } from "../mails/mails.service";
import { ConfigService } from "@nestjs/config";
import { CreateAdminDto } from "./dto/create-admin-data.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";
import { WalletService } from "../wallet/wallet.service";
import { DealService } from "../deal/deal.service";
import {
  WalletTransaction,
  WalletTransactionStatus,
  WalletTransactionTypes,
} from "../wallet-transaction/entities/wallet-transaction.entity";
import { ActivationStatus } from "src/shared/enums";
import { ChangeActivationStatusDto } from "../event/dto/change-activation-status.dto";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";
import { Deal } from "../deal/entities/deal.entity";
import { Community } from "../community/entities/community.entity";
import { Event, EventType } from "../event/entities/event.entity";
import { ValidationException } from "src/utils/formate-validation-exception";
import { GetUsersDto } from "./dto/get-users.dto";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { TransactionManagerService } from "src/shared/services/transaction-manager.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,

    @InjectRepository(ActivationChangeLog)
    private readonly activationChangeLogRepository: Repository<ActivationChangeLog>,

    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,

    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,

    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,

    private readonly transactionManagerService: TransactionManagerService,
    private readonly jwtService: JwtService,
    private readonly mailsService: MailsService,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly dealService: DealService,
  ) {}

  async getUsers(queryData: GetUsersDto) {
    const { registrationStatus, role, page, perPage, activationStatus } = queryData;

    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .where("user.deletedAt IS NULL")
      .orderBy("user.createdAt", "DESC"); // Add any ordering if needed

    if (role) {
      queryBuilder.andWhere("user.role = :role", { role });
    } else {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where("user.role = :ngoRole", { ngoRole: UserRoles.NGO }).orWhere("user.role = :companyRole", {
            companyRole: UserRoles.COMPANY,
          });
        }),
      );
    }

    if (registrationStatus) {
      queryBuilder.andWhere("user.registrationStatus = :registrationStatus", { registrationStatus });
    }

    if (activationStatus) {
      queryBuilder.andWhere("user.activationStatus = :userStatus", { userStatus: activationStatus });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate<User>(queryBuilder, paginationOptions);
  }

  async approveUserKyc(id: number, approveUserKycDto: ApproveUserKycDto) {
    const { registrationStatus } = approveUserKycDto;

    return this.transactionManagerService.executeInTransaction(async queryRunner => {
      const user = await queryRunner.manager.findOne(User, {
        where: {
          deletedAt: IsNull(),
          id,
          role: In([UserRoles.COMPANY, UserRoles.NGO]),
        },
      });

      if (!user) {
        throw new BadRequestException("User not found");
      }

      if (user.registrationStatus === RegistrationStatus.APPROVED) {
        throw new BadRequestException("KYC is already approved");
      }

      if (user.registrationStatus === registrationStatus) {
        throw new BadRequestException(`KYC is already ${registrationStatus}`);
      }

      // Update user registration status
      user.registrationStatus = registrationStatus;
      console.log("🚀 ~ AdminService ~ approveUserKyc ~ user:", user);
      await queryRunner.manager.save(user);

      // Handle KYC rejection
      if (registrationStatus === RegistrationStatus.REJECTED) {
        await this.mailsService.sendUserKycRejectedEmail(user);
        return;
      }

      // Handle KYC approval
      const encodedUserId = await this.jwtService.signAsync({
        userId: user.id,
      });
      console.log("🚀 ~ AdminService ~ approveUserKyc ~ encodedUserId:", encodedUserId);

      const redirectUrl = `${this.configService.get("urls.frontendPanelBaseUrl")}${this.configService.get("urls.createPasswordPath")}?userToken=${encodedUserId}`;

      console.log("🚀 ~ AdminService ~ approveUserKyc ~ redirectUrl:", redirectUrl)
      // Create wallet for the user
      await this.walletService.createWallet(user, queryRunner);

      // Send approval email
      await this.mailsService.sendUserKycApprovedEmail(user, redirectUrl);
    });
  }

  async createAdmin(createAdminData: CreateAdminDto) {
    const isUserExists = await this.usersRepository.findOne({
      where: {
        email: createAdminData.email,
      },
      withDeleted: true,
    });

    if (isUserExists) {
      throw new ValidationException({ email: "Email already exists" });
    }

    const newUser = this.usersRepository.create({ role: UserRoles.ADMIN, ...createAdminData });

    await this.usersRepository.save(newUser);

    const { password, ...userData } = newUser;

    return { userData };
  }

  async updateAdmin(user: User, updateAdminDto: UpdateAdminDto) {
    if (updateAdminDto.email) {
      const isEmailExists = await this.usersRepository.findOne({
        where: {
          email: updateAdminDto.email,
          id: Not(user.id),
        },
      });

      if (isEmailExists) {
        throw new ConflictException("Email already exists.");
      }
    }

    if (updateAdminDto.phoneNumber) {
      const isPhoneExists = await this.usersRepository.findOne({
        where: {
          phoneNumber: updateAdminDto.phoneNumber,
          id: Not(user.id),
        },
      });
      if (isPhoneExists) {
        throw new ConflictException("Phone number already exists");
      }
    }

    Object.assign(user, updateAdminDto);

    return this.usersRepository.save(user);
  }

  async getDashboardStats(currentUser: User) {
    const userCountStatistics = await this.usersRepository
      .createQueryBuilder("user")
      .select([
        // Company counts
        `SUM(CASE WHEN user.role = :roleCompany THEN 1 ELSE 0 END) AS "totalCompany"`,
        `SUM(CASE WHEN user.role = :roleCompany AND user.registrationStatus = :registrationStatusPending THEN 1 ELSE 0 END) AS "pendingCompany"`,
        `SUM(CASE WHEN user.role = :roleCompany AND user.registrationStatus = :registrationStatusApproved AND user.activationStatus = :statusActive THEN 1 ELSE 0 END) AS "approvedAndActiveCompany"`,
        `SUM(CASE WHEN user.role = :roleCompany AND user.registrationStatus = :registrationStatusApproved AND user.activationStatus = :statusInActive THEN 1 ELSE 0 END) AS "approvedAndInActiveCompany"`,
        `SUM(CASE WHEN user.role = :roleCompany AND user.registrationStatus = :registrationStatusRejected THEN 1 ELSE 0 END) AS "rejectedCompany"`,

        // Ngo counts
        `SUM(CASE WHEN user.role = :roleNgo THEN 1 ELSE 0 END) AS "totalNgo"`,
        `SUM(CASE WHEN user.role = :roleNgo AND user.registrationStatus = :registrationStatusPending THEN 1 ELSE 0 END) AS "pendingNgo"`,
        `SUM(CASE WHEN user.role = :roleNgo AND user.registrationStatus = :registrationStatusApproved AND user.activationStatus = :statusActive THEN 1 ELSE 0 END) AS "approvedAndActiveNgo"`,
        `SUM(CASE WHEN user.role = :roleNgo AND user.registrationStatus = :registrationStatusApproved AND user.activationStatus = :statusInActive THEN 1 ELSE 0 END) AS "approvedAndInActiveNgo"`,
        `SUM(CASE WHEN user.role = :roleNgo AND user.registrationStatus = :registrationStatusRejected THEN 1 ELSE 0 END) AS "rejectedNgo"`,

        // Volunteer counts
        `SUM(CASE WHEN user.role = :roleVolunteer THEN 1 ELSE 0 END) AS "totalVolunteers"`,
        `SUM(CASE WHEN user.role = :roleVolunteer AND user.activationStatus = :statusActive  THEN 1 ELSE 0 END) AS "activeVolunteers"`,
        `SUM(CASE WHEN user.role = :roleVolunteer AND user.activationStatus = :statusInActive THEN 1 ELSE 0 END) AS "inActiveVolunteers"`,
      ])
      .setParameters({ roleCompany: UserRoles.COMPANY, roleNgo: UserRoles.NGO, roleVolunteer: UserRoles.VOLUNTEER })
      .setParameters({
        registrationStatusPending: RegistrationStatus.PENDING,
        registrationStatusApproved: RegistrationStatus.APPROVED,
        registrationStatusRejected: RegistrationStatus.REJECTED,
      })
      .setParameters({
        statusActive: ActivationStatus.ACTIVE,
        statusInActive: ActivationStatus.IN_ACTIVE,
      })
      .getRawOne();

    const dealsCounts = await this.dealService.countDeals();

    const charityCountStats = await this.eventRepository
      .createQueryBuilder("event")
      .select([
        // Upcoming Events
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusActive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "upcomingActiveArchived"`,
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusActive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "upcomingActiveNotArchived"`,
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusInactive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "upcomingInactiveArchived"`,
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusInactive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "upcomingInactiveNotArchived"`,

        // Ongoing Events
        `SUM(CASE WHEN event.startDate <= NOW() AND (event.endDate > NOW() OR event.endDate IS NULL) AND event.activationStatus = :statusActive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "ongoingActiveArchived"`,
        `SUM(CASE WHEN event.startDate <= NOW() AND (event.endDate > NOW() OR event.endDate IS NULL) AND event.activationStatus = :statusActive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "ongoingActiveNotArchived"`,
        `SUM(CASE WHEN event.startDate <= NOW() AND (event.endDate > NOW() OR event.endDate IS NULL) AND event.activationStatus = :statusInactive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "ongoingInactiveArchived"`,
        `SUM(CASE WHEN event.startDate <= NOW() AND (event.endDate > NOW() OR event.endDate IS NULL) AND event.activationStatus = :statusInactive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "ongoingInactiveNotArchived"`,

        // Expired Events (only if endDate is present and < NOW())
        `SUM(CASE WHEN event.endDate IS NOT NULL AND event.endDate < NOW() AND event.activationStatus = :statusActive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "expiredActiveArchived"`,
        `SUM(CASE WHEN event.endDate IS NOT NULL AND event.endDate < NOW() AND event.activationStatus = :statusActive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "expiredActiveNotArchived"`,
        `SUM(CASE WHEN event.endDate IS NOT NULL AND event.endDate < NOW() AND event.activationStatus = :statusInactive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "expiredInactiveArchived"`,
        `SUM(CASE WHEN event.endDate IS NOT NULL AND event.endDate < NOW() AND event.activationStatus = :statusInactive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "expiredInactiveNotArchived"`,

        // Donation Complete Events
        `SUM(CASE WHEN event.donationReceived >= event.donationRequired AND event.donationRequired IS NOT NULL AND event.activationStatus = :statusActive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "donationCompleteActiveArchived"`,
        `SUM(CASE WHEN event.donationReceived >= event.donationRequired AND event.donationRequired IS NOT NULL AND event.activationStatus = :statusActive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "donationCompleteActiveNotArchived"`,
        `SUM(CASE WHEN event.donationReceived >= event.donationRequired AND event.donationRequired IS NOT NULL AND event.activationStatus = :statusInactive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "donationCompleteInactiveArchived"`,
        `SUM(CASE WHEN event.donationReceived >= event.donationRequired AND event.donationRequired IS NOT NULL AND event.activationStatus = :statusInactive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "donationCompleteInactiveNotArchived"`,
      ])
      .where("event.type = :charity", { charity: EventType.CHARITY })
      .setParameters({
        statusActive: ActivationStatus.ACTIVE,
        statusInactive: ActivationStatus.IN_ACTIVE,
      })
      .getRawOne();

    const campaignCountStats = await this.eventRepository
      .createQueryBuilder("event")
      .select([
        // Upcoming Events
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusActive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "upcomingActiveArchived"`,
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusActive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "upcomingActiveNotArchived"`,
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusInactive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "upcomingInactiveArchived"`,
        `SUM(CASE WHEN event.startDate > NOW() AND event.activationStatus = :statusInactive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "upcomingInactiveNotArchived"`,

        // Ongoing Events
        `SUM(CASE WHEN event.startDate <= NOW() AND event.endDate > NOW() AND event.activationStatus = :statusActive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "ongoingActiveArchived"`,
        `SUM(CASE WHEN event.startDate <= NOW() AND event.endDate > NOW() AND event.activationStatus = :statusActive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "ongoingActiveNotArchived"`,
        `SUM(CASE WHEN event.startDate <= NOW() AND event.endDate > NOW() AND event.activationStatus = :statusInactive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "ongoingInactiveArchived"`,
        `SUM(CASE WHEN event.startDate <= NOW() AND event.endDate > NOW() AND event.activationStatus = :statusInactive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "ongoingInactiveNotArchived"`,

        // Expired Events
        `SUM(CASE WHEN event.endDate < NOW() AND event.activationStatus = :statusActive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "expiredActiveArchived"`,
        `SUM(CASE WHEN event.endDate < NOW() AND event.activationStatus = :statusActive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "expiredActiveNotArchived"`,
        `SUM(CASE WHEN event.endDate < NOW() AND event.activationStatus = :statusInactive AND event.closed IS NOT NULL THEN 1 ELSE 0 END) AS "expiredInactiveArchived"`,
        `SUM(CASE WHEN event.endDate < NOW() AND event.activationStatus = :statusInactive AND event.closed IS NULL THEN 1 ELSE 0 END) AS "expiredInactiveNotArchived"`,
      ])
      .where("event.type = :charity", { charity: EventType.CAMPAIGN })
      .setParameters({
        statusActive: ActivationStatus.ACTIVE,
        statusInactive: ActivationStatus.IN_ACTIVE,
      })
      .getRawOne();

    return {
      ngoCounts: {
        total: userCountStatistics.totalNgo,
        pending: userCountStatistics.pendingNgo,
        approvedAndActive: userCountStatistics.approvedAndActiveNgo,
        approvedAndInActive: userCountStatistics.approvedAndInActiveNgo,
        rejected: userCountStatistics.rejectedNgo,
      },
      companyCounts: {
        total: userCountStatistics.totalCompany,
        pending: userCountStatistics.pendingCompany,
        approvedAndActive: userCountStatistics.approvedAndActiveCompany,
        approvedAndInActive: userCountStatistics.approvedAndInActiveCompany,
        rejected: userCountStatistics.rejectedCompany,
      },
      volunteerCounts: {
        total: userCountStatistics.totalVolunteers,
        active: userCountStatistics.activeVolunteers,
        inActive: userCountStatistics.inActiveVolunteers,
      },
      dealsCounts: dealsCounts,
      charityCounts: charityCountStats,
      campaignCounts: campaignCountStats,
    };
  }

  async getRevenueStats(currentUser: User, year: number) {
    const results = await this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .select([
        `EXTRACT(MONTH FROM walletTransaction.createdAt) AS month`, // Group by month
        `COUNT(CASE WHEN walletTransaction.type = :purchase THEN walletTransaction.amount END) AS "voltzSold"`,
        `COUNT(CASE WHEN walletTransaction.deal IS NOT NULL AND walletTransaction.type = :transfer AND walletTransaction.status = :walletTransactionStatusReleased THEN walletTransaction.amount END) AS "voltzReachedToCompany"`,
      ])
      .where("EXTRACT(YEAR FROM walletTransaction.createdAt) = :year", { year })
      .setParameters({ purchase: WalletTransactionTypes.PURCHASE, transfer: WalletTransactionTypes.TRANSFER })
      .setParameters({ walletTransactionStatusReleased: WalletTransactionStatus.RELEASED })
      .groupBy("month")
      .orderBy("month", "ASC")
      .getRawMany();

    // Fill in missing months with zero values
    const fullYearResults = Array.from({ length: 12 }, (_, index) => {
      const month = (index + 1).toString().padStart(2, "0"); // Pad month with '0' for single-digit months
      const found = results.find(result => result.month === month);
      return found ? found : { month, voltzSold: "0", voltzReachedToCompany: "0" };
    });

    return fullYearResults;
  }

  async changeActivationStatus(
    userId: number,
    currentUser: User,
    changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    await this.transactionManagerService.executeInTransaction(async queryRunner => {
      // Find the user
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException("User does not exist");
      }

      if (user.role === UserRoles.ADMIN) {
        throw new BadRequestException(`Admin can't be mark ${changeActivationStatusDto.status}`);
      }

      if (user.activationStatus === changeActivationStatusDto.status) {
        throw new BadRequestException(`User is already ${user.activationStatus}`);
      }

      // Update user activation status
      user.activationStatus = changeActivationStatusDto.status;
      await queryRunner.manager.save(User, user);

      // Log activation status change using queryRunner
      const activationChangeLog = queryRunner.manager.create(ActivationChangeLog, {
        user: user,
        admin: currentUser,
        reason: changeActivationStatusDto.reason,
        status: changeActivationStatusDto.status,
      });

      // Save the activation change log within the transaction
      await queryRunner.manager.save(ActivationChangeLog, activationChangeLog);

      // Handle role-specific activation/inactivation logic
      if (user.role === UserRoles.VOLUNTEER) {
        if (changeActivationStatusDto.status === ActivationStatus.IN_ACTIVE) {
          await this.inactivateVolunteer(currentUser, user, queryRunner);
        } else if (changeActivationStatusDto.status === ActivationStatus.ACTIVE) {
          await this.activateVolunteer(user, queryRunner);
        }
      } else if (user.role === UserRoles.NGO) {
        if (changeActivationStatusDto.status === ActivationStatus.IN_ACTIVE) {
          await this.inactivateNgo(currentUser, user, queryRunner);
        } else if (changeActivationStatusDto.status === ActivationStatus.ACTIVE) {
          await this.activateNgo(user, queryRunner);
        }
      } else if (user.role === UserRoles.COMPANY) {
        if (changeActivationStatusDto.status === ActivationStatus.IN_ACTIVE) {
          await this.inactivateCompany(currentUser, user, queryRunner);
        } else if (changeActivationStatusDto.status === ActivationStatus.ACTIVE) {
          await this.activateCompany(user, queryRunner);
        }
      }
    });
  }

  // HELPER UTILITY FUNCTIONS ====================================================================================
  private async inactivateVolunteer(admin: User, volunteer: User, queryRunner: QueryRunner) {
    // 1. Get all communities created by the volunteer
    const communities = await queryRunner.manager.find(Community, {
      where: { createdBy: { id: volunteer.id } },
    });

    // 2. Inactivate all communities
    const updatedCommunities = communities.map(community => {
      community.activationStatus = ActivationStatus.IN_ACTIVE;
      return community;
    });

    // 3. Create activation change logs for the communities
    const communityChangeLogs = communities.map(community =>
      queryRunner.manager.create(ActivationChangeLog, {
        community: community,
        admin: admin,
        reason: `Community inactivated because its creator Volunteer has been inactivated`,
        status: ActivationStatus.IN_ACTIVE,
        isCreatorInactive: true,
      }),
    );

    // 4. Save all the updated communities and logs
    await queryRunner.manager.save(Community, updatedCommunities);
    await queryRunner.manager.save(ActivationChangeLog, communityChangeLogs);
  }

  private async activateVolunteer(volunteer: User, queryRunner: QueryRunner) {
    // 1. Get all communities created by the volunteer
    const communities = await queryRunner.manager.find(Community, {
      where: { createdBy: { id: volunteer.id } },
    });

    const updatedCommunities = [];

    // 2. Revert each community to its previous status
    for (const community of communities) {
      const lastActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { community: { id: community.id } },
        order: { createdAt: "DESC" },
      });

      // Remove the last activation log
      if (lastActivationLog) {
        await queryRunner.manager.remove(ActivationChangeLog, lastActivationLog);
      }

      const secondLastActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { community: { id: community.id } },
        order: { createdAt: "DESC" },
      });

      // Revert the community to its previous status
      community.activationStatus = secondLastActivationLog?.status || ActivationStatus.ACTIVE;
      updatedCommunities.push(community);
    }

    // 3. Save the updated communities
    await queryRunner.manager.save(Community, updatedCommunities);
  }

  private async inactivateNgo(admin: User, ngo: User, queryRunner: QueryRunner) {
    // 1. Get all events, communities, and campaign managers associated with the NGO
    const events = await queryRunner.manager.find(Event, {
      where: { user: { id: ngo.id } },
    });
    const communities = await queryRunner.manager.find(Community, {
      where: { createdBy: { id: ngo.id } },
    });
    const campaignManagers = await queryRunner.manager.find(User, {
      where: { campaignManagerCreatedBy: { id: ngo.id } },
    });

    // 2. Inactivate all events, communities, and campaign managers
    events.forEach(event => (event.activationStatus = ActivationStatus.IN_ACTIVE));
    communities.forEach(community => (community.activationStatus = ActivationStatus.IN_ACTIVE));
    campaignManagers.forEach(cm => (cm.activationStatus = ActivationStatus.IN_ACTIVE));

    // 3. Create activation change logs
    const logs = [
      ...events.map(event =>
        queryRunner.manager.create(ActivationChangeLog, {
          event,
          admin,
          reason: `Event inactivated because its creator NGO has been inactivated`,
          status: ActivationStatus.IN_ACTIVE,
          isCreatorInactive: true,
        }),
      ),
      ...communities.map(community =>
        queryRunner.manager.create(ActivationChangeLog, {
          community,
          admin,
          reason: `Community inactivated because its creator NGO has been inactivated`,
          status: ActivationStatus.IN_ACTIVE,
          isCreatorInactive: true,
        }),
      ),
      ...campaignManagers.map(cm =>
        queryRunner.manager.create(ActivationChangeLog, {
          user: cm,
          admin,
          reason: `Campaign manager inactivated because its creator NGO has been inactivated`,
          status: ActivationStatus.IN_ACTIVE,
          isCreatorInactive: true,
        }),
      ),
    ];

    // 4. Save all entities and logs
    await queryRunner.manager.save(Event, events);
    await queryRunner.manager.save(Community, communities);
    await queryRunner.manager.save(User, campaignManagers);
    await queryRunner.manager.save(ActivationChangeLog, logs);
  }

  private async activateNgo(ngo: User, queryRunner: QueryRunner) {
    // 1. Get all events, communities, and campaign managers associated with the NGO
    const events = await queryRunner.manager.find(Event, { where: { user: { id: ngo.id } } });
    const communities = await queryRunner.manager.find(Community, { where: { createdBy: { id: ngo.id } } });
    const campaignManagers = await queryRunner.manager.find(User, {
      where: { campaignManagerCreatedBy: { id: ngo.id } },
    });

    const updatedEvents: Event[] = [];
    const updatedCommunities: Community[] = [];
    const updatedCampaignManagers: User[] = [];

    // 2. Revert each event to its previous status
    for (const event of events) {
      const lastEventActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { event: { id: event.id } },
        order: { createdAt: "DESC" },
      });

      if (lastEventActivationLog) {
        await queryRunner.manager.remove(ActivationChangeLog, lastEventActivationLog);
      }

      const secondLastEventActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { event: { id: event.id } },
        order: { createdAt: "DESC" },
      });

      event.activationStatus = secondLastEventActivationLog?.status || ActivationStatus.ACTIVE;
      updatedEvents.push(event);
    }

    // 3. Revert each community to its previous status
    for (const community of communities) {
      const lastCommunityActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { community: { id: community.id } },
        order: { createdAt: "DESC" },
      });

      if (lastCommunityActivationLog) {
        await queryRunner.manager.remove(ActivationChangeLog, lastCommunityActivationLog);
      }

      const secondLastCommunityActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { community: { id: community.id } },
        order: { createdAt: "DESC" },
      });

      community.activationStatus = secondLastCommunityActivationLog?.status || ActivationStatus.ACTIVE;
      updatedCommunities.push(community);
    }

    // 4. Revert each campaign manager to its previous status
    for (const campaignManager of campaignManagers) {
      const lastCampaignManagerActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { user: { id: campaignManager.id } },
        order: { createdAt: "DESC" },
      });

      if (lastCampaignManagerActivationLog) {
        await queryRunner.manager.remove(ActivationChangeLog, lastCampaignManagerActivationLog);
      }

      const secondLastCampaignManagerActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { user: { id: campaignManager.id } },
        order: { createdAt: "DESC" },
      });

      campaignManager.activationStatus = secondLastCampaignManagerActivationLog?.status || ActivationStatus.ACTIVE;
      updatedCampaignManagers.push(campaignManager);
    }

    // 5. Save the updated events, communities, and campaign managers
    if (updatedEvents.length) {
      await queryRunner.manager.save(Event, updatedEvents);
    }

    if (updatedCommunities.length) {
      await queryRunner.manager.save(Community, updatedCommunities);
    }

    if (updatedCampaignManagers.length) {
      await queryRunner.manager.save(User, updatedCampaignManagers);
    }
  }

  private async inactivateCompany(admin: User, company: User, queryRunner: QueryRunner) {
    // 1. Get all deals associated with the company
    const deals = await queryRunner.manager.find(Deal, { where: { user: { id: company.id } } });

    // 2. Create an array to hold all the updated deals and their change logs
    const updatedDeals = deals.map(deal => {
      deal.activationStatus = ActivationStatus.IN_ACTIVE;
      return queryRunner.manager.create(Deal, deal); // Collect the updated deal objects
    });

    const dealChangeLogs = deals.map(deal => {
      return queryRunner.manager.create(ActivationChangeLog, {
        deal: deal,
        admin: admin,
        reason: `Deal inactivated because its creator company has been inactivated`,
        status: ActivationStatus.IN_ACTIVE,
        isCreatorInactive: true,
      });
    });

    // 3. Save all the updated deals and logs in bulk
    if (updatedDeals.length > 0) {
      await queryRunner.manager.save(Deal, updatedDeals);
    }

    if (dealChangeLogs.length > 0) {
      await queryRunner.manager.save(ActivationChangeLog, dealChangeLogs);
    }
  }

  private async activateCompany(company: User, queryRunner: QueryRunner) {
    // 1. Get all deals associated with the company
    const deals = await queryRunner.manager.find(Deal, { where: { user: { id: company.id } } });

    const updatedDeals = [];

    // 2. Revert each deal to its previous status
    for (const deal of deals) {
      // Find the last activation log for each deal
      const lastActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { deal: { id: deal.id } },
        order: { createdAt: "DESC" },
      });

      // Remove the last activation log
      if (lastActivationLog) {
        await queryRunner.manager.remove(ActivationChangeLog, lastActivationLog);
      }

      // Find the second last activation log for each deal
      const secondLastActivationLog = await queryRunner.manager.findOne(ActivationChangeLog, {
        where: { deal: { id: deal.id } },
        order: { createdAt: "DESC" },
      });

      // Reverting the deal to the previous status
      deal.activationStatus = secondLastActivationLog?.status || ActivationStatus.ACTIVE;
      updatedDeals.push(deal);
    }

    // 3. Save the updated deals
    if (updatedDeals.length > 0) {
      await queryRunner.manager.save(Deal, updatedDeals);
    }
  }
}
