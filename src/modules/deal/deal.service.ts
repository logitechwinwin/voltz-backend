import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateDealDto, DiscountType } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Deal } from "./entities/deal.entity";
import { LessThanOrEqual, MoreThan, Repository } from "typeorm";
import { Category } from "../category/entities/category.entity";
import { Product } from "../product/entities/product.entity";
import { User, UserRoles } from "../user/user.entity";
import { GetAllDtoDeals } from "./dto/get-all.dto";
import { IPaginationOptions, paginateRaw, Pagination } from "nestjs-typeorm-paginate";
import { S3Service } from "../s3/s3.service";
import { Wishlist } from "./entities/wishlist.entity";
import { AvailDealDto } from "./dto/avail-deal.dto";
import { DealRequestService } from "../deal-request/deal-request.service";
import { DealsAnalyticsDto } from "./dto/deals-analytics.dto";
import { DealRequest, DealRequestStatuses } from "../deal-request/entities/deal-request.entity";
import { GetDealsReportDto } from "./dto/get-deals-report.dto";
import { CsvService } from "src/shared/services/csv.service";
import { Response } from "express";
import { DealS3Paths } from "src/static/s3-paths";
import { WalletTransactionStatus, WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { Wallet } from "../wallet/entities/wallet.entity";
import { WalletService } from "../wallet/wallet.service";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";
import { ChangeActivationStatusDto } from "../event/dto/change-activation-status.dto";
import { ActivationStatus } from "src/shared/enums";
import * as moment from "moment";

@Injectable()
export class DealService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(DealRequest)
    private readonly dealRequestRepository: Repository<DealRequest>,

    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,

    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(ActivationChangeLog)
    private readonly activationChangeLogRepository: Repository<ActivationChangeLog>,

    private readonly dealRequestService: DealRequestService,
    private readonly s3Service: S3Service,

    private readonly csvService: CsvService,
    private readonly walletService: WalletService,
  ) {}

  async create(createDealDto: CreateDealDto, user: User) {
    const { products, category, discountAmount, discountType, dealAmount, ...rest } = createDealDto;

    const invalidProductIds = [];
    const productEntries = [];
    const invalidCategoryIds = [];
    const categoryEntries = [];

    for (const productId of products) {
      const product = await this.productRepository.findOne({ where: { id: productId } });
      if (!product) {
        invalidProductIds.push(productId);
      } else {
        productEntries.push(product);
      }
    }

    for (const categoryId of category) {
      const isCategory = await this.categoryRepository.findOne({ where: { id: categoryId } });
      if (!isCategory) {
        invalidCategoryIds.push(categoryId);
      } else {
        categoryEntries.push(isCategory);
      }
    }

    if (invalidProductIds.length > 0) {
      throw new BadRequestException(`Invalid product IDs: ${invalidProductIds.join(", ")}`);
    }
    if (invalidCategoryIds.length > 0) {
      throw new BadRequestException(`Invalid category IDs: ${invalidCategoryIds.join(", ")}`);
    }

    const bannerImagePath = await this.s3Service.uploadFile(rest.bannerImage, DealS3Paths.BANNER_IMAGES);

    // Calculate dealAmountAfterDiscount based on discount
    let dealAmountAfterDiscount: number;
    if (discountType === DiscountType.FIXED) {
      const calcAmmount = dealAmount - discountAmount;
      dealAmountAfterDiscount = calcAmmount;
    } else if (discountType === DiscountType.PERCENTAGE) {
      const totalDiscount = (discountAmount / 100) * dealAmount;
      const floatAmount = dealAmount - totalDiscount;
      const calcAmount = Number(floatAmount.toFixed(2));
      dealAmountAfterDiscount = calcAmount;
    }

    const deal = this.dealRepository.create({
      ...rest,
      dealAmount: dealAmount,
      dealAmountAfterDiscount: dealAmountAfterDiscount,
      discountAmount,
      discountType,
      bannerImage: bannerImagePath,
      products: productEntries,
      category: categoryEntries,
      user: user,
    });

    const savedDeal = await deal.save();
    return savedDeal;
  }

  async findAll(getAllData: GetAllDtoDeals): Promise<Pagination<Deal | Wishlist>> {
    const {
      page,
      perPage,
      search,
      category,
      companyId,
      userId,
      savedDeals,
      onGoing,
      upComing,
      expired,
      popularDeals,
      excludeDealId,
      activationStatus,
    } = getAllData;

    const queryBuilder = this.dealRepository
      .createQueryBuilder("deal")
      .leftJoinAndSelect("deal.products", "products")
      .leftJoinAndSelect("deal.user", "user")
      .leftJoinAndSelect("deal.category", "category")
      .leftJoinAndSelect("wishlist", "wishlist", "wishlist.dealId = deal.id AND wishlist.userId = :userId", {
        userId: userId || null,
      }) // Use the userId to filter saved deals
      .select([
        "deal.*",
        "json_build_object( 'id', user.id, 'name', user.name, 'profileImage', user.profileImage, 'bannerImage', user.bannerImage, 'firstName', user.firstName, 'lastName', user.lastName) as user",
        'COALESCE(BOOL_OR(wishlist.id IS NOT NULL), false) AS "isSaved"', // Check if the deal is saved
        "COALESCE(json_agg(DISTINCT jsonb_build_object('id', category.id, 'label', category.label))) AS categories", // Aggregate categories
      ])
      .groupBy("deal.id")
      .addGroupBy("user.id");

    if (activationStatus) {
      queryBuilder.andWhere("deal.activationStatus = :activationStatus", { activationStatus });
    }

    if (excludeDealId) {
      queryBuilder.andWhere("deal.id != :excludeDealId", { excludeDealId });
    }

    if (onGoing) {
      queryBuilder
        .andWhere("deal.from <= :currentDateTime", { currentDateTime: new Date() })
        .andWhere("deal.to > :currentDateTime", { currentDateTime: new Date() });
    }

    if (upComing) {
      queryBuilder.andWhere("deal.from > :currentDateTime", { currentDateTime: new Date() });
    }

    if (expired) {
      queryBuilder.andWhere("deal.to < :currentDateTime", { currentDateTime: new Date() });
    }

    // Adding search functionality
    if (search) {
      queryBuilder.andWhere("deal.dealName ILIKE :search", { search: `%${search}%` });
    }

    // Adding category filtering
    if (category?.length) {
      queryBuilder.andWhere("category.id IN (:...category)", { category });
    }

    // Filter by Company ID
    if (companyId) {
      queryBuilder.andWhere("deal.userId = :companyId", { companyId });
    }

    // Filter by saved deals if requested
    if (savedDeals) {
      queryBuilder.andWhere("wishlist.id IS NOT NULL");
    }

    if (companyId && popularDeals) {
      queryBuilder.andWhere("deal.availCount > 0");
      queryBuilder.orderBy("deal.availCount", "DESC");
    }

    queryBuilder.andWhere("deal.deletedAt IS NULL").orderBy("deal.createdAt", "DESC");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const rawResults = await paginateRaw(queryBuilder, paginationOptions);

    return {
      items: rawResults.items as unknown as Deal[], // Type assertion
      meta: rawResults.meta,
    };
  }

  async findOne(id: number, user: User): Promise<Deal & { isSaved: boolean }> {
    const deal = await this.dealRepository.findOne({
      where: {
        id,
        deletedAt: null,
        ...((!user || user.role === UserRoles.VOLUNTEER) && { activationStatus: ActivationStatus.ACTIVE }), // make sure user doesn't find in_active deal
      },
      relations: ["products", "user", "category"],
    });

    if (!deal) {
      throw new NotFoundException("Deal does not exist");
    }

    let isSaved = false;

    if (user) {
      // Check if the deal is saved in the user's wishlist
      const wishlist = await this.wishlistRepository.findOne({
        where: {
          deal: { id },
          user: { id: user.id },
        },
      });

      if (wishlist) {
        isSaved = true;
      }
    }

    // Return the deal with the isSaved flag
    return Object.assign(deal, { isSaved: isSaved });
  }

  async update(id: number, updateDealDto: UpdateDealDto, user: User) {
    const { products, category, discountAmount, discountType, dealAmount, ...rest } = updateDealDto;

    // Find the existing deal
    const deal = await this.dealRepository.findOne({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!deal) {
      throw new NotFoundException("Deal does not exist");
    }

    // Handle product validation and association
    const productEntries = [];
    if (products && products.length > 0) {
      for (const productId of products) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
          throw new BadRequestException(`Invalid product ID: ${productId}`);
        }
        productEntries.push(product);
      }
      deal.products = productEntries;
    }

    // Handle category validation and association
    const categoryEntries = [];
    if (category && category.length > 0) {
      for (const categoryId of category) {
        const isCategory = await this.categoryRepository.findOne({ where: { id: categoryId } });
        if (!isCategory) {
          throw new BadRequestException(`Invalid category ID: ${categoryId}`);
        }
        categoryEntries.push(isCategory);
      }
      deal.category = categoryEntries; // Update category association
    }

    // Update other fields
    Object.assign(deal, rest);

    // Handle image upload
    if (rest.bannerImage) {
      await this.s3Service.deleteFile(deal.bannerImage);
      deal.bannerImage = await this.s3Service.uploadFile(rest.bannerImage, DealS3Paths.BANNER_IMAGES);
    }

    // Calculate dealAmount based on discountType
    if (discountType === DiscountType.FIXED) {
      const calcAmount = dealAmount - discountAmount;
      deal.dealAmountAfterDiscount = calcAmount;
      deal.discountType = DiscountType.FIXED;
    } else if (discountType === DiscountType.PERCENTAGE) {
      const totalDiscount = (discountAmount / 100) * dealAmount;
      const floatAmount = dealAmount - totalDiscount;
      const calcAmount = Number(floatAmount.toFixed(2));
      deal.dealAmountAfterDiscount = calcAmount;
      deal.discountType = DiscountType.PERCENTAGE;
    }

    deal.discountAmount = discountAmount; // Keep discountAmount as is
    deal.dealAmount = dealAmount;

    // Save the updated deal
    await this.dealRepository.save(deal);

    // Return the updated deal
    const updatedDeal = await this.dealRepository.findOne({
      where: { id },
      relations: ["products", "category", "user"],
    });
    return updatedDeal;
  }

  async delete(id: number) {
    const deal = await this.dealRepository.findOneBy({
      id,
      deletedAt: null,
    });

    if (!deal) {
      throw new NotFoundException("Deal does not exist");
    }

    return deal.softRemove();
  }

  async saveDeal(user: User, id: number): Promise<{ message: string }> {
    // Check if the deal exists and is not soft-deleted
    const deal = await this.dealRepository.findOne({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!deal) {
      throw new NotFoundException("Deal not found");
    }

    // Check if the deal is already in the user's wishlist
    const existingWishlistItem = await this.wishlistRepository.findOne({
      where: {
        deal: { id },
        user: { id: user.id },
      },
    });

    if (existingWishlistItem) {
      // Remove the deal from the wishlist if it exists
      await this.wishlistRepository.remove(existingWishlistItem);
      return {
        message: "Deal removed from wishlist",
      };
    }

    // Add the deal to the wishlist
    const newWishlistItem = this.wishlistRepository.create({
      deal,
      user,
    });

    await this.wishlistRepository.save(newWishlistItem);

    return {
      message: "Deal added to wishlist",
    };
  }

  async availDeal(user: User, availDealDto: AvailDealDto) {
    const deal = await this.dealRepository.findOne({
      relations: {
        user: {
          wallet: true,
        },
        products: true,
      },
      where: {
        id: availDealDto.dealId,
        from: LessThanOrEqual(new Date()),
        to: MoreThan(new Date()),
        activationStatus: ActivationStatus.ACTIVE,
      },
    });

    if (!deal) {
      throw new BadRequestException("Deal not available to be availed");
    }

    const newWalletTransaction = await this.walletService.transferDueToDealRequestInitiated({
      sourceWallet: user.wallet,
      targetWallet: deal.user.wallet,
      amount: deal.voltzRequired,
      deal: deal,
    });

    // ** created dealRequest in created state
    const dealRequest = await this.dealRequestService.createDealRequest(
      {
        dealId: deal.id,
        transactionId: newWalletTransaction.id,
      },
      user,
    );

    return dealRequest;
  }

  async getDealsAnalytics(getDealsAnalyticsDto: DealsAnalyticsDto, user: User) {
    const { startDate, endDate } = getDealsAnalyticsDto;

    const companyVoltzEarnedQuery = this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .leftJoin("walletTransaction.targetWallet", "wallet")
      .leftJoin("wallet.user", "company")
      .where("company.id = :companyId", { companyId: user.id })
      .andWhere("walletTransaction.status = :status", { status: WalletTransactionStatus.RELEASED })
      .select("SUM(walletTransaction.amount)", "totalVoltzEarned");

    const dealRequestStatsQuery = this.dealRequestRepository
      .createQueryBuilder("dealRequest")
      .leftJoin("dealRequest.company", "company")
      .leftJoin("dealRequest.deal", "deal")
      .select([
        `SUM(CASE WHEN dealRequest.status = :accepted THEN 1 ELSE 0 END) AS "acceptedRequests"`,
        `SUM(CASE WHEN dealRequest.status = :accepted THEN deal.dealAmount ELSE 0 END) AS "revenue"`,
      ])
      .where("company.id = :currentUserId", { currentUserId: user.id })
      .setParameters({
        accepted: DealRequestStatuses.ACCEPTED,
      });

    if (startDate && endDate) {
      companyVoltzEarnedQuery.andWhere(
        "walletTransaction.createdAt >= :startDate AND walletTransaction.createdAt <= :endDate",
        {
          startDate: startDate,
          endDate: endDate,
        },
      );

      dealRequestStatsQuery.andWhere("dealRequest.createdAt >= :startDate AND dealRequest.createdAt <= :endDate", {
        startDate: startDate,
        endDate: endDate,
      });
    }

    const companyVoltzEarned = await companyVoltzEarnedQuery.getRawOne();
    const dealRequestStats = await dealRequestStatsQuery.getRawOne();

    return {
      voltzSpentByVolunteer: companyVoltzEarned?.totalVoltzEarned || 0,
      ...dealRequestStats,
    };
  }

  async getDealsReport(getDealsReportDto: GetDealsReportDto, user: User) {
    const { startDate, endDate, page, perPage } = getDealsReportDto;

    const queryBuilder = this.generateQueryForDealsReport(user, startDate, endDate);

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginateRaw(queryBuilder, paginationOptions);
  }

  async downloadDealsReport(getDealsReportDto: GetDealsReportDto, user: User, res: Response) {
    const { startDate, endDate } = getDealsReportDto;

    const dealsReportsQuery = this.generateQueryForDealsReport(user, startDate, endDate);

    const dealsReports = await dealsReportsQuery.getRawMany();

    const dealsReportsHeaders = [
      { id: "dealName", title: "Deal Name" },
      { id: "volunteerParticipated", title: "Volunteer Participated" },
      { id: "voltzEarned", title: "Voltz Earned" },
      { id: "totalAmountEarned", title: "Total Amount Earned" },
      { id: "startDate", title: "Start Date" },
      { id: "endDate", title: "End Date" },
    ];

    const data = dealsReports.map(dealReport => ({
      dealName: dealReport.dealName,
      volunteerParticipated: dealReport.volunteerParticipated,
      voltzEarned: dealReport.totalVoltzEarned,
      totalAmountEarned: dealReport.totalAmountEarned,
      startDate: moment(startDate).utc().format("DD MMM YYYY, hh:mm A") + " GMT",
      endDate: moment(startDate).utc().format("DD MMM YYYY, hh:mm A") + " GMT",
    }));

    const reportPath = await this.csvService.generateCsvFile(dealsReportsHeaders, data, "deals-report");

    res.download(reportPath, "deals-report.csv", async err => {
      await this.csvService.deleteFile(reportPath);
    });
  }

  private generateQueryForDealsReport(dealCreator: User, startDate: Date, endDate: Date) {
    const dealsReportsQuery = this.dealRepository
      .createQueryBuilder("deals")
      .leftJoin("deals.dealRequests", "dealRequests")
      .select(["deals.*"])
      .addSelect("COUNT(dealRequests.id)", "volunteerParticipated")
      .addSelect("SUM(deals.dealAmountAfterDiscount)", "totalAmountEarned")
      .addSelect("SUM(deals.voltzRequired)", "totalVoltzEarned")
      .where("deals.userId = :creatorId", { creatorId: dealCreator.id })
      .andWhere("dealRequests.status = :completedStatus", { completedStatus: DealRequestStatuses.ACCEPTED })
      .groupBy("deals.id")
      .orderBy(`"volunteerParticipated"`, "DESC");

    if (startDate && endDate) {
      dealsReportsQuery.andWhere("dealRequests.createdAt >= :startDate AND dealRequests.createdAt <= :endDate", {
        startDate: startDate,
        endDate: endDate,
      });
    }

    return dealsReportsQuery;
  }

  async countDeals(companyId?: number): Promise<{
    totalDeals: number;
    runningDeals: number;
    upcomingDeals: number;
    expiredDeals: number;
  }> {
    const currentDate = new Date();

    const query = this.dealRepository
      .createQueryBuilder("deal")
      .leftJoin("deal.user", "creator")
      .select([
        `COUNT(deal.id) AS "totalDeals"`,
        `SUM(CASE WHEN deal.from <= :currentDate AND deal.to >= :currentDate THEN 1 ELSE 0 END) AS "runningDeals"`,
        `SUM(CASE WHEN deal.from > :currentDate THEN 1 ELSE 0 END) AS "upcomingDeals"`,
        `SUM(CASE WHEN deal.to < :currentDate THEN 1 ELSE 0 END) AS "expiredDeals"`,
      ])
      .setParameter("currentDate", currentDate);

    if (companyId) {
      query.where("creator.id = :companyId", { companyId });
    }

    const counts = await query.getRawOne();

    return {
      totalDeals: Number(counts.totalDeals),
      runningDeals: Number(counts.runningDeals),
      upcomingDeals: Number(counts.upcomingDeals),
      expiredDeals: Number(counts.expiredDeals),
    };
  }

  async changeActivationStatus(
    dealId: number,
    currentUser: User,
    changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    const deal = await this.dealRepository.findOne({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException("deal does not exists");
    }

    if (deal.activationStatus === changeActivationStatusDto.status) {
      throw new BadRequestException(`deal is already ${deal.activationStatus}`);
    }

    deal.activationStatus = changeActivationStatusDto.status;
    await this.dealRepository.save(deal);

    const activationChangeLog = this.activationChangeLogRepository.create({
      deal: deal,
      admin: currentUser,
      reason: changeActivationStatusDto.reason,
      status: changeActivationStatusDto.status,
    });

    await this.activationChangeLogRepository.save(activationChangeLog);
  }
}
