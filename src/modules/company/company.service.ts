import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, IsNull, Repository } from "typeorm";
import { RegistrationStatus, User, UserRoles } from "../user/user.entity";
import { S3Service } from "../s3/s3.service";
import { removeTablePrefix } from "src/utils/remove-table-prefix";
import { Follow } from "../follow/entities/follow.entity";
import { Deal } from "../deal/entities/deal.entity";
import { DealRequest, DealRequestStatuses } from "../deal-request/entities/deal-request.entity";
import { Product } from "../product/entities/product.entity";
import { UserS3Paths } from "src/static/s3-paths";
import {
  WalletTransactionStatus,
  WalletTransaction,
  WalletTransactionTypes,
} from "../wallet-transaction/entities/wallet-transaction.entity";
import { DealService } from "../deal/deal.service";
import { GetAllCompaniesDto } from "./dto/get-all-companies.dto";
import { ActivationStatus } from "src/shared/enums";
import { DonateVoltzToNgoDto } from "./dto/donate-voltz-to-ngo.dto";
import { TransactionManagerService } from "src/shared/services/transaction-manager.service";
import { WalletService } from "../wallet/wallet.service";
import { Wallet } from "../wallet/entities/wallet.entity";

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,

    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,

    @InjectRepository(DealRequest)
    private readonly dealRequestRepository: Repository<DealRequest>,

    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,

    private readonly dealService: DealService,
    private readonly transactionManagerService: TransactionManagerService,
    private readonly walletService: WalletService,
    private readonly s3Service: S3Service,
  ) {}

  async findOne(id: number, user: User) {
    const company = await this.usersRepository.findOne({
      where: {
        id,
        deletedAt: null,
        role: UserRoles.COMPANY,
        ...((!user || user.role === UserRoles.VOLUNTEER) && {
          activationStatus: ActivationStatus.ACTIVE,
        }),
      },
    });

    if (!company) {
      throw new NotFoundException("Company does not exist");
    }

    let isFollowed: Follow;
    if (user) {
      isFollowed = await this.followRepository.findOne({
        where: {
          follower: { id: user.id },
          followee: { id: company.id },
        },
      });
    }

    return { ...company, isFollowed: isFollowed ? true : false };
  }

  async donateVoltzToNgo(company: User, donateVoltzToNgoDto: DonateVoltzToNgoDto) {
    const { numberOfVoltz, ngoId } = donateVoltzToNgoDto;

    const ngo = await this.usersRepository.findOne({
      where: {
        id: ngoId,
        role: UserRoles.NGO,
        activationStatus: ActivationStatus.ACTIVE,
        deletedAt: IsNull(),
      },
    });

    if (!ngo) {
      throw new NotFoundException("NGO does not exist");
    }

    await this.transactionManagerService.executeInTransaction(async queryRunner => {
      const companyWallet = await this.walletService.getWalletByUserId(company.id, queryRunner);

      if (companyWallet.balance < numberOfVoltz) {
        throw new BadRequestException("Insufficient voltz");
      }

      const ngoWallet = await this.walletService.getWalletByUserId(ngoId, queryRunner);

      companyWallet.balance -= numberOfVoltz;
      ngoWallet.balance += numberOfVoltz;

      await queryRunner.manager.save(Wallet, companyWallet);
      await queryRunner.manager.save(Wallet, ngoWallet);

      const walletTransaction = queryRunner.manager.create(WalletTransaction, {
        sourceWallet: companyWallet,
        targetWallet: ngoWallet,
        amount: numberOfVoltz,
        status: WalletTransactionStatus.RELEASED,
        type: WalletTransactionTypes.DONATE,
      });

      await queryRunner.manager.save(WalletTransaction, walletTransaction);
    });

    return ngo;
  }

  async update(user: User, updateCompanyData: UpdateCompanyDto) {
    const userId = user.id;
    const { _requestContext, ...updateFields } = updateCompanyData;

    const userEntity = await this.usersRepository.findOne({
      where: { id: userId },
    });

    const profileImage = await this.s3Service.uploadFile(updateFields.profileImage, UserS3Paths.PROFILE_IMAGE);
    if (profileImage) {
      await this.s3Service.deleteFile(userEntity.profileImage);
    }

    const bannerImage = await this.s3Service.uploadFile(updateFields.bannerImage, UserS3Paths.BANNER_IMAGE);
    if (bannerImage) {
      await this.s3Service.deleteFile(userEntity.bannerImage);
    }

    const certificateOfReg = await this.s3Service.uploadFile(
      updateFields.certificateOfReg,
      UserS3Paths.CERTIFICATE_OF_REGISTRATION,
    );
    if (certificateOfReg) {
      await this.s3Service.deleteFile(userEntity.certificateOfReg);
    }

    const csrPolicyDoc = await this.s3Service.uploadFile(updateFields.csrPolicyDoc, UserS3Paths.CSR_POLICY_DOC);
    if (csrPolicyDoc) {
      await this.s3Service.deleteFile(userEntity.csrPolicyDoc);
    }

    const updatedUserData = {
      ...updateFields,
      ...(updateFields.profileImage && {
        profileImage,
      }),
      ...(updateFields.bannerImage && {
        bannerImage,
      }),
      ...(updateFields.certificateOfReg && {
        certificateOfReg,
      }),
      ...(updateFields.csrPolicyDoc && {
        csrPolicyDoc,
      }),
    };

    const makeDateForUpdate = Object.assign(userEntity, updatedUserData);
    const savedUser = await this.usersRepository.save(makeDateForUpdate);

    if (!savedUser) {
      throw new BadRequestException("User not found");
    }

    return { savedUser };
  }

  async getAll(queryData: GetAllCompaniesDto) {
    const { page, perPage, search, location, sdgs, userId, exceedFollowed, activationStatus } = queryData;

    const baseQuery = this.usersRepository
      .createQueryBuilder("user")
      .leftJoin("user.followers", "followers")
      .addSelect(["COUNT(followers.id) AS user_followerCount"])
      .where("user.role = :role", { role: UserRoles.COMPANY })
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

    const offset = (page - 1) * perPage;
    baseQuery.limit(perPage).offset(offset);
    results = await baseQuery.getRawMany();
    totalItems = await baseQuery.getCount();

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

  async getDashboardStats(companyId: number, currentUser: User) {
    // ** company can only see his stats, admin can see any ngo's stats
    if (currentUser.role === UserRoles.COMPANY && companyId !== currentUser.id) {
      throw new ForbiddenException("You don't have access for this statistics");
    }

    const user = await this.usersRepository.findOne({
      where: { id: companyId, role: UserRoles.COMPANY },
      relations: {
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Company not found");
    }
    const dealStats = await this.dealService.countDeals(user.id);

    const companyVoltzEarned = await this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .leftJoin("walletTransaction.targetWallet", "wallet")
      .leftJoin("wallet.user", "company")
      .where("company.id = :companyId", { companyId: user.id })
      .andWhere("walletTransaction.status = :status", { status: WalletTransactionStatus.RELEASED })
      .select("SUM(walletTransaction.amount)", "totalVoltzEarned")
      .getRawOne();

    const dealRequestStats = await this.dealRequestRepository
      .createQueryBuilder("dealRequest")
      .leftJoin("dealRequest.company", "company")
      .leftJoin("dealRequest.deal", "deal")
      .select([
        `COUNT(dealRequest.id) AS "totalDealRequests"`,
        `SUM(CASE WHEN dealRequest.status = :accepted THEN 1 ELSE 0 END) AS "acceptedRequests"`,
        `SUM(CASE WHEN dealRequest.status = :rejected THEN 1 ELSE 0 END) AS "rejectedRequests"`,
        `SUM(CASE WHEN dealRequest.status = :created THEN 1 ELSE 0 END) AS "pendingRequests"`,
        `SUM(CASE WHEN dealRequest.status = :accepted THEN deal.dealAmountAfterDiscount ELSE 0 END) AS "revenue"`,
      ])
      .where("company.id = :currentUserId", { currentUserId: user.id })
      .setParameters({
        accepted: DealRequestStatuses.ACCEPTED,
        rejected: DealRequestStatuses.REJECTED,
        created: DealRequestStatuses.PENDING,
      })
      .getRawOne();

    const highestDeal = await this.dealRepository
      .createQueryBuilder("deal")
      .leftJoinAndSelect("deal.user", "company")
      .leftJoinAndSelect("deal.dealRequests", "dealRequests")
      .leftJoinAndSelect("dealRequests.transaction", "transaction")
      .select(["deal.*", `SUM(transaction.amount) AS "voltzReceived"`])
      .where("company.id = :companyId", { companyId: user.id })
      .andWhere("dealRequests.status = :acceptedStatus", { acceptedStatus: DealRequestStatuses.ACCEPTED })
      .groupBy("deal.id")
      .orderBy(`"voltzReceived"`, "DESC")
      .getRawOne();

    const dealsStats = await this.dealRepository
      .createQueryBuilder("deal")
      .leftJoinAndSelect("deal.user", "company")
      .leftJoinAndSelect("deal.dealRequests", "dealRequests")
      .leftJoinAndSelect("dealRequests.transaction", "transaction")
      .select(["deal.*", `SUM(transaction.amount) AS "voltzReceived"`])
      .where("company.id = :companyId", { companyId: user.id })
      .andWhere("dealRequests.status = :acceptedStatus", { acceptedStatus: DealRequestStatuses.ACCEPTED })
      .groupBy("deal.id")
      .orderBy(`"voltzReceived"`, "DESC")
      .getRawMany();

    const currentYear = new Date().getFullYear(); // Extract the year as a number

    const monthlyEarnings = await this.dealRequestRepository
      .createQueryBuilder("dealRequest")
      .leftJoin("dealRequest.transaction", "walletTransaction")
      .leftJoinAndSelect("dealRequest.company", "company")
      .select([
        `TO_CHAR(dealRequest.createdAt, 'Mon') AS month`, // Abbreviated month name
        `SUM(walletTransaction.amount) AS "totalEarnings"`,
      ])
      .where("company.id = :currentUserId", { currentUserId: user.id })
      .andWhere("dealRequest.status = :accepted", { accepted: DealRequestStatuses.ACCEPTED })
      .andWhere("EXTRACT(YEAR FROM dealRequest.createdAt) = :currentYear", { currentYear })
      .andWhere("walletTransaction.status = :status", { status: WalletTransactionStatus.RELEASED })
      .groupBy("TO_CHAR(dealRequest.createdAt, 'Mon')")
      .orderBy("TO_CHAR(dealRequest.createdAt, 'Mon')", "ASC") // Ordering by month number
      .setParameter("currentYear", currentYear)
      .getRawMany();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Create an array of all 12 months with default value 0 and month names
    const allMonths = monthNames.map(monthName => ({
      month: monthName,
      totalEarnings: 0,
    }));

    // Map over the results to replace default values with actual earnings
    const earningsWithAllMonths = allMonths.map(monthObj => {
      const match = monthlyEarnings.find(earning => earning.month === monthObj.month);
      if (match) {
        return {
          ...monthObj,
          totalEarnings: Number(match.totalEarnings),
        };
      }
      return monthObj;
    });

    const totalProducts = await this.productRepository
      .createQueryBuilder("products")
      .select([`COUNT(*) AS "totalProducts"`])
      .where("products.userId = :companyId", { companyId: user.id })
      .getRawOne();

    return {
      ...dealStats,
      ...companyVoltzEarned,
      ...dealRequestStats,
      revenue: dealRequestStats.revenue || 0,
      ...totalProducts,
      highestDeal: highestDeal || null,
      monthlyEarnings: earningsWithAllMonths,
      dealsStats,
    };
  }
}
