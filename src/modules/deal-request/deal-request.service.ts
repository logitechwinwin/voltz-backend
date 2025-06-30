import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Response } from "express";
import * as moment from "moment";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { CsvService } from "src/shared/services/csv.service";
import { Repository } from "typeorm";
import { Deal } from "../deal/entities/deal.entity";
import { User, UserRoles } from "../user/user.entity";
import { NotificationService } from "./../notification/notification.service";
import { CreateDealRequestDto } from "./dto/create-deal-request.dto";
import { GetAllDealRequestDto } from "./dto/get-all-deal-request.dto";
import { UpdateDealRequestDto } from "./dto/update-deal-request.dto";
import { DealRequest, DealRequestStatuses } from "./entities/deal-request.entity";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { WalletTransactionStatus, WalletTransaction } from "../wallet-transaction/entities/wallet-transaction.entity";
import { WalletService } from "../wallet/wallet.service";
import { TransactionManagerService } from "src/shared/services/transaction-manager.service";

@Injectable()
export class DealRequestService {
  constructor(
    @InjectRepository(DealRequest)
    private readonly dealRequestRepository: Repository<DealRequest>,

    private readonly walletService: WalletService,

    private readonly transactionManagerService: TransactionManagerService,

    private readonly notificationService: NotificationService,

    private readonly csvService: CsvService,
  ) {}

  async createDealRequest(createDealRequestDto: CreateDealRequestDto, requestor: User) {
    const { dealId, transactionId } = createDealRequestDto;

    const dealRequest = await this.transactionManagerService.executeInTransaction(async queryRunner => {
      const deal = await queryRunner.manager.findOne(Deal, {
        relations: {
          user: true,
        },
        where: {
          id: dealId,
        },
      });

      if (!deal) {
        throw new BadRequestException("Deal not found");
      }

      const transaction = await queryRunner.manager.findOne(WalletTransaction, {
        where: {
          id: transactionId,
        },
      });

      if (!transaction) {
        throw new BadRequestException("Transaction not found ");
      }

      const dealRequest = this.dealRequestRepository.create({
        deal: deal,
        company: deal.user,
        transaction: transaction,
        requestor: requestor,
      });

      await queryRunner.manager.save(dealRequest);

      const notificationData = {
        title: `New request for the deal ${deal.dealName}`,
        message: `${requestor.firstName} ${requestor.lastName} want to avail the deal ${deal.dealName}`,
        profileImage: requestor.profileImage,
        bannerImage: requestor.bannerImage,
        data: {
          notificationType: NotificationType.NEW_DEAL_REQUEST,
          dealId: deal.id,
        },
      };

      await this.notificationService.sendNotification(deal.user, notificationData);

      return dealRequest;
    });

    return dealRequest;
  }

  async update(id: number, updateDealRequestDto: UpdateDealRequestDto, user: User) {
    return this.transactionManagerService.executeInTransaction(async queryRunner => {
      const dealRequest = await queryRunner.manager.findOne(DealRequest, {
        relations: {
          deal: true,
          company: {
            wallet: true,
          },
          requestor: {
            wallet: true,
          },
          transaction: true,
        },
        where: {
          id,
          status: DealRequestStatuses.PENDING,
          company: {
            id: user.id,
          },
        },
      });

      if (!dealRequest) {
        throw new BadRequestException("Deal request doesn't exist");
      }

      dealRequest.status = updateDealRequestDto.status;

      if (updateDealRequestDto.status === DealRequestStatuses.REJECTED) {
        await this.walletService.transferDueToDealRequestProcessed({
          sourceWallet: dealRequest.requestor.wallet,
          targetWallet: dealRequest.company.wallet,
          walletTransaction: dealRequest.transaction,
          walletTransactionStatus: WalletTransactionStatus.CANCELLED,
          queryRunner,
        });

        // Send rejection notification
        await this.sendDealNotification(
          dealRequest.requestor,
          "Deal Request Rejected",
          "We regret to inform you that your Deal request has been rejected. If you have any questions or need further assistance, please feel free to contact our support team.",
        );

        // Deal Acceptance Logic
      } else if (updateDealRequestDto.status === DealRequestStatuses.ACCEPTED) {
        await this.walletService.transferDueToDealRequestProcessed({
          sourceWallet: dealRequest.requestor.wallet,
          targetWallet: dealRequest.company.wallet,
          walletTransaction: dealRequest.transaction,
          walletTransactionStatus: WalletTransactionStatus.RELEASED,
          queryRunner,
        });

        // Increment availCount in the associated deal
        const deal = dealRequest.deal;
        deal.availCount += 1;
        await queryRunner.manager.save(Deal, deal);

        // Send acceptance notification
        await this.sendDealNotification(
          dealRequest.requestor,
          "Deal Request Accepted",
          "Congratulations! Your Deal request has been accepted.",
        );
      }

      await queryRunner.manager.save(DealRequest, dealRequest);
    });
  }

  async findAll(getAllDealRequestDto: GetAllDealRequestDto, user: User) {
    const { page, perPage } = getAllDealRequestDto;

    const queryBuilder = this.generateFindAllDealsRequestsQuery(user, getAllDealRequestDto);

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate(queryBuilder, paginationOptions);
  }

  async downloadDealsRequests(getAllDealRequestDto: GetAllDealRequestDto, user: User, res: Response) {
    const dealsRequests = await this.generateFindAllDealsRequestsQuery(user, getAllDealRequestDto).getMany();

    const dealRequestFileHeaders = [
      { id: "dealName", title: "Deal Name" },
      { id: "requestedBy", title: "Requested By" },
      { id: "dealAmount", title: "Deal Amount" },
      { id: "voltzRequired", title: "Voltz Required" },
      { id: "status", title: "Status" },
      { id: "requestCreatedAt", title: "Requested At" },
    ];

    const dealsRequestsFormatted = dealsRequests.map(dealRequest => ({
      dealName: dealRequest.deal.dealName,
      requestedBy: `${dealRequest.requestor.firstName} ${dealRequest.requestor.lastName}`,
      dealAmount: dealRequest.deal.dealAmount,
      voltzRequired: dealRequest.deal.voltzRequired,
      status: dealRequest.status,
      requestCreatedAt: dealRequest.createdAt,
    }));

    const reportPath = await this.csvService.generateCsvFile(
      dealRequestFileHeaders,
      dealsRequestsFormatted,
      "deal-requests",
    );

    res.download(reportPath, "deal-requests.csv", async err => {
      await this.csvService.deleteFile(reportPath);
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} dealRequest`;
  }

  generateFindAllDealsRequestsQuery(user: User, getAllDealRequestDto: GetAllDealRequestDto) {
    const { search, status, dealId, from, to } = getAllDealRequestDto;

    const queryBuilder = this.dealRequestRepository
      .createQueryBuilder("dealRequest")
      .leftJoinAndSelect("dealRequest.deal", "deal")
      .leftJoin("deal.user", "user")
      .leftJoinAndSelect("dealRequest.company", "company")
      .leftJoinAndSelect("dealRequest.requestor", "requestor");

    if (user.role === UserRoles.COMPANY) {
      queryBuilder.where("deal.user.id =:companyId", { companyId: user.id });
    } else if (user.role === UserRoles.VOLUNTEER) {
      queryBuilder.where("requestor.id =:volunteerId", { volunteerId: user.id });
    }

    if (search) {
      queryBuilder.andWhere("deal.dealName ILIKE :search", {
        search: `%${search}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere("dealRequest.status =:status", { status });
    }

    if (dealId) {
      queryBuilder.andWhere("dealRequest.dealId = :dealId", { dealId });
    }

    if (from) {
      queryBuilder.andWhere("dealRequest.createdAt >= :from", { from: moment(from).toDate() });
    }

    if (to) {
      queryBuilder.andWhere("dealRequest.createdAt <= :to", { to: moment(to).toDate() });
    }

    return queryBuilder.orderBy("dealRequest.createdAt", "DESC");
  }

  async sendDealNotification(user: User, title: string, message: string) {
    const notificationData = {
      title,
      message,
      profileImage: "",
      bannerImage: "",
      data: {
        notificationType: NotificationType.DEAL_REQUEST_STATUS,
      },
    };

    await this.notificationService.sendNotification(user, notificationData);
  }
}
