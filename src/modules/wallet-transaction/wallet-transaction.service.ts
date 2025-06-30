import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { User, UserRoles } from "src/modules/user/user.entity";
import { WalletTransaction, WalletTransactionTypes } from "./entities/wallet-transaction.entity";
import { GetAllWalletTransactionDto } from "./dto/get-all-wallet-transaction.dto";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { Response } from "express";
import { CsvService } from "src/shared/services/csv.service";
import * as moment from "moment";

@Injectable()
export class WalletTransactionService {
  constructor(
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepository: Repository<WalletTransaction>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,

    private readonly csvService: CsvService,
  ) {}

  async getAllWalletTransactions(getAllWalletTransactions: GetAllWalletTransactionDto, currentUser: User) {
    const { page, perPage, userId } = getAllWalletTransactions;

    // ** ngo and company can not see other's wallet transactions
    if ((currentUser.role === UserRoles.NGO || currentUser.role === UserRoles.COMPANY) && currentUser.id !== userId) {
      throw new ForbiddenException("You are not authorized to access this information");
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const queryBuilder = await this.generateGetAllWalletTransactionQuery(user, getAllWalletTransactions);

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return await paginate(queryBuilder, paginationOptions);
  }

  async downloadWalletTransactions(
    getAllWalletTransactions: GetAllWalletTransactionDto,
    currentUser: User,
    res: Response,
  ) {
    const { userId } = getAllWalletTransactions;

    // ** ngo and company can also see their wallet transactions
    if ((currentUser.role === UserRoles.NGO || currentUser.role === UserRoles.COMPANY) && currentUser.id !== userId) {
      throw new ForbiddenException("You are not authorized to access this route");
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const queryBuilder = await this.generateGetAllWalletTransactionQuery(user, getAllWalletTransactions);
    const walletTransactions = await queryBuilder.getMany();

    if (user.role === UserRoles.COMPANY) {
      const walletTransactionsHeaders = [
        {
          id: "volunteerName",
          title: "Volunteer",
        },
        {
          id: "dealName",
          title: "Deal",
        },
        {
          id: "dealAmountAfterDiscount",
          title: "Deal Amount After Discount",
        },
        {
          id: "donatedTo",
          title: "Donated To",
        },
        {
          id: "amount",
          title: "Voltz",
        },
        {
          id: "walletTransactionStatus",
          title: "Status",
        },
        {
          id: "walletTransactionType",
          title: "Type",
        },
        {
          id: "occurredAt",
          title: "Occurred At",
        },
      ];

      const walletTransactionData = walletTransactions.map(walletTransaction => ({
        volunteerName:
          walletTransaction.type === WalletTransactionTypes.TRANSFER
            ? `${walletTransaction.sourceWallet?.user?.firstName || "Voltz User"} ${walletTransaction.sourceWallet?.user?.lastName || "Voltz User"}`
            : "-",
        dealName: walletTransaction.type === WalletTransactionTypes.TRANSFER ? walletTransaction.deal?.dealName : "-",
        dealAmountAfterDiscount:
          walletTransaction.type === WalletTransactionTypes.TRANSFER
            ? `$${parseFloat(walletTransaction.deal.dealAmountAfterDiscount.toFixed(2))}`
            : "-",

        donatedTo:
          walletTransaction.type === WalletTransactionTypes.DONATE ? walletTransaction.targetWallet.user.name : "-",

        amount: parseFloat(walletTransaction.amount.toFixed(2)),
        walletTransactionStatus: walletTransaction.status,
        walletTransactionType: walletTransaction.type,
        occurredAt: moment(walletTransaction.createdAt).utc().format("DD MMM YYYY, hh:mm A") + " GMT",
      }));

      const filePath = await this.csvService.generateCsvFile(
        walletTransactionsHeaders,
        walletTransactionData,
        "company-transactions",
      );

      res.download(filePath, "company-transactions.csv", async err => {
        await this.csvService.deleteFile(filePath);
      });
    } else if (user.role === UserRoles.NGO) {
      const walletTransactionsHeaders = [
        {
          id: "eventName",
          title: "Event",
        },
        {
          id: "volunteerName",
          title: "Volunteer",
        },
        {
          id: "campaignManager",
          title: "Campaign Manager",
        },
        {
          id: "donationFrom",
          title: "Donation From",
        },
        {
          id: "amount",
          title: "Voltz",
        },
        {
          id: "transactionType",
          title: "Transaction Type",
        },
        {
          id: "occurredAt",
          title: "Occurred At",
        },
      ];

      const walletTransactionData = walletTransactions.map(walletTransaction => ({
        eventName: walletTransaction.type === WalletTransactionTypes.TRANSFER ? walletTransaction.event.title : "-",
        volunteerName:
          walletTransaction.type === WalletTransactionTypes.TRANSFER
            ? walletTransaction.targetWallet.user.firstName
            : "-",
        campaignManager:
          walletTransaction.type === WalletTransactionTypes.TRANSFER
            ? `${walletTransaction.event?.campaignManager?.firstName || "-"}`
            : "-",

        donationFrom:
          walletTransaction.type === WalletTransactionTypes.DONATE ? walletTransaction.sourceWallet.user.name : "",

        amount: parseFloat(walletTransaction.amount.toFixed(2)),
        transactionType: walletTransaction.type,
        occurredAt: moment(walletTransaction.createdAt).utc().format("DD MMM YYYY, hh:mm A") + " GMT",
      }));

      const filePath = await this.csvService.generateCsvFile(
        walletTransactionsHeaders,
        walletTransactionData,
        "ngo-transactions",
      );

      res.download(filePath, "ngo-transactions.csv", async err => {
        await this.csvService.deleteFile(filePath);
      });
    } else if (user.role === UserRoles.VOLUNTEER) {
      const walletTransactionsHeaders = [
        {
          id: "volunteerName",
          title: "Volunteer Name",
        },
        {
          id: "dealName",
          title: "Deal Name",
        },
        {
          id: "eventName",
          title: "Event Name",
        },
        {
          id: "amount",
          title: "Voltz",
        },
        {
          id: "walletTransactionStatus",
          title: "Transaction Status",
        },
        {
          id: "occurredAt",
          title: "Occurred At",
        },
      ];

      const walletTransactionData = walletTransactions.map(walletTransaction => ({
        volunteerName: walletTransaction.deal
          ? `${walletTransaction.sourceWallet.user.firstName} ${walletTransaction.sourceWallet.user.lastName}`
          : `${walletTransaction.targetWallet.user.firstName} ${walletTransaction.targetWallet.user.lastName}`,
        dealName: walletTransaction.deal ? walletTransaction.deal.dealName : "-",
        eventName: walletTransaction.event ? walletTransaction.event.title : "-",
        amount: parseFloat(walletTransaction.amount.toFixed(2)),
        walletTransactionStatus: walletTransaction.status,

        occurredAt: moment(walletTransaction.createdAt).utc().format("DD MMM YYYY, hh:mm A") + " GMT",
      }));

      const filePath = await this.csvService.generateCsvFile(
        walletTransactionsHeaders,
        walletTransactionData,
        "volunteer-transactions",
      );

      res.download(filePath, "volunteer-transactions.csv", async err => {
        await this.csvService.deleteFile(filePath);
      });
    }
  }

  async generateGetAllWalletTransactionQuery(user: User, getAllWalletTransactions: GetAllWalletTransactionDto) {
    const { from, till, dealId, campaignManagerId, eventId, type, status, transactionsOf } = getAllWalletTransactions;

    const queryBuilder = this.walletTransactionRepository
      .createQueryBuilder("walletTransaction")
      .leftJoinAndSelect("walletTransaction.sourceWallet", "sourceWallet")
      .leftJoinAndSelect("walletTransaction.targetWallet", "targetWallet")
      .leftJoinAndSelect("sourceWallet.user", "sourceWalletOwner")
      .leftJoinAndSelect("targetWallet.user", "targetWalletOwner")
      .leftJoinAndSelect("walletTransaction.deal", "deal")
      .leftJoinAndSelect("walletTransaction.event", "event")
      .leftJoinAndSelect("walletTransaction.campaignManager", "campaignManager")
      .where(
        new Brackets(qb => {
          qb.where("sourceWalletOwner.role = :transactionsOf", { transactionsOf }).orWhere(
            "targetWalletOwner.role = :transactionsOf",
            {
              transactionsOf,
            },
          );
        }),
      )
      .orderBy("walletTransaction.createdAt", "DESC");

    if (user.role === UserRoles.COMPANY || user.role === UserRoles.NGO || user.role === UserRoles.VOLUNTEER) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where("sourceWalletOwner.id = :userId", { userId: user.id }).orWhere("targetWalletOwner.id = :userId", {
            userId: user.id,
          });
        }),
      );
    }

    if (campaignManagerId) {
      queryBuilder.andWhere("walletTransaction.campaignManagerId = :campaignManagerId", {
        campaignManagerId: campaignManagerId,
      });
    }

    if (from) {
      queryBuilder.andWhere("walletTransaction.createdAt >= :from", { from });
    }

    if (till) {
      queryBuilder.andWhere("walletTransaction.createdAt <= :till", { till });
    }

    if (dealId) {
      queryBuilder.andWhere("deal.id = :dealId", { dealId });
    }

    if (eventId) {
      queryBuilder.andWhere("walletTransaction.eventId = :eventId", { eventId });
    }

    if (type) {
      queryBuilder.andWhere("walletTransaction.type = :type", { type });
    }

    if (status) {
      queryBuilder.andWhere("walletTransaction.status = :status", { status });
    }

    return queryBuilder;
  }
}
