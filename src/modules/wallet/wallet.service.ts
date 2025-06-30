import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Wallet } from "./entities/wallet.entity";
import {
  WalletTransactionStatus,
  WalletTransaction,
  WalletTransactionTypes,
} from "../wallet-transaction/entities/wallet-transaction.entity";
import { QueryRunner, Repository } from "typeorm";
import { User } from "../user/user.entity";
import { Deal } from "../deal/entities/deal.entity";
import { Event } from "../event/entities/event.entity";

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private readonly walletTransactionRepository: Repository<WalletTransaction>,
  ) {}

  async createWallet(user: User, queryRunner: QueryRunner): Promise<Wallet> {
    const wallet = queryRunner.manager.create(Wallet, { user, balance: 0 });
    return queryRunner.manager.save(Wallet, wallet);
  }

  async addVoltzToWalletWithPurchase({
    targetWallet,
    amount,
    description,
    status = WalletTransactionStatus.RELEASED,
  }: {
    targetWallet: Wallet;
    amount: number;
    description?: string;
    status?: WalletTransactionStatus;
  }): Promise<WalletTransaction> {
    targetWallet.balance += amount;

    await this.walletRepository.save(targetWallet);

    const transaction = this.walletTransactionRepository.create({
      targetWallet: targetWallet,
      type: WalletTransactionTypes.PURCHASE,
      amount,
      description,
      status,
    });

    return this.walletTransactionRepository.save(transaction);
  }

  async transferBetweenWallets({
    sourceWallet,
    targetWallet,
    amount,
    description,
    deal,
    event,
    campaignManager,
  }: {
    sourceWallet: Wallet;
    targetWallet: Wallet;
    amount: number;
    description?: string;
    deal?: Deal;
    event?: Event;
    campaignManager?: User;
  }): Promise<WalletTransaction> {
    if (sourceWallet.balance < amount) {
      throw new BadRequestException("You do not have enough funds in your wallet");
    }

    sourceWallet.balance -= amount;
    targetWallet.balance += amount;

    await this.walletRepository.save(sourceWallet);
    await this.walletRepository.save(targetWallet);

    const walletTransaction = this.walletTransactionRepository.create({
      sourceWallet,
      targetWallet,
      type: WalletTransactionTypes.TRANSFER,
      amount,
      description: description,
      deal,
      event,
      campaignManager,
    });

    return await this.walletTransactionRepository.save(walletTransaction);
  }

  async transferDueToDealRequestInitiated({
    sourceWallet,
    targetWallet,
    amount,
    description,
    deal,
  }: {
    sourceWallet: Wallet;
    targetWallet: Wallet;
    amount: number;
    description?: string;
    deal?: Deal;
  }) {
    if (sourceWallet.balance < amount) {
      throw new BadRequestException("You do not have enough funds in your wallet");
    }

    sourceWallet.balance -= amount;
    await this.walletRepository.save(sourceWallet);

    const walletTransaction = this.walletTransactionRepository.create({
      sourceWallet,
      targetWallet,
      type: WalletTransactionTypes.TRANSFER,
      amount,
      description: description,
      deal,
      status: WalletTransactionStatus.HOLD,
    });

    return await this.walletTransactionRepository.save(walletTransaction);
  }

  async transferDueToDealRequestProcessed({
    sourceWallet,
    targetWallet,
    walletTransaction,
    walletTransactionStatus,
    queryRunner, // Add queryRunner as a parameter
  }: {
    sourceWallet: Wallet;
    targetWallet: Wallet;
    walletTransaction: WalletTransaction;
    walletTransactionStatus: WalletTransactionStatus;
    queryRunner: QueryRunner; // Accept the queryRunner
  }) {
    if (walletTransactionStatus === WalletTransactionStatus.RELEASED) {
      targetWallet.balance += walletTransaction.amount;
      await queryRunner.manager.save(targetWallet); // Use queryRunner.manager to save

      walletTransaction.status = WalletTransactionStatus.RELEASED;
      await queryRunner.manager.save(walletTransaction); // Use queryRunner.manager to save
    } else if (walletTransactionStatus === WalletTransactionStatus.CANCELLED) {
      sourceWallet.balance += walletTransaction.amount;
      await queryRunner.manager.save(sourceWallet); // Use queryRunner.manager to save

      walletTransaction.status = WalletTransactionStatus.CANCELLED;
      await queryRunner.manager.save(walletTransaction); // Use queryRunner.manager to save
    }
  }

  async getWalletByUserId(userId: number, queryRunner: QueryRunner): Promise<Wallet> {
    const wallet = await queryRunner.manager.findOne(Wallet, { where: { user: { id: userId } } });
    if (!wallet) {
      throw new NotFoundException("Wallet not found for the user");
    }
    return wallet;
  }

  // async getWalletTransactions(
  //   walletId: number,
  // ): Promise<{ incomingTransactions: WalletTransaction[]; outgoingTransactions: WalletTransaction[] }> {
  //   const wallet = await this.walletRepository.findOne({
  //     where: { id: walletId },
  //     relations: ["incomingTransactions", "outgoingTransactions"], // Ensure these relations are loaded
  //   });

  //   if (!wallet) {
  //     throw new NotFoundException("Wallet not found");
  //   }

  //   // Fetch transactions related to the wallet
  //   const incomingTransactions = await this.walletTransactionRepository.find({
  //     where: { targetWallet: { id: walletId } },
  //     order: { createdAt: "DESC" }, // Optional: Order by date or any other criteria
  //   });

  //   const outgoingTransactions = await this.walletTransactionRepository.find({
  //     where: { sourceWallet: { id: walletId } },
  //     order: { createdAt: "DESC" }, // Optional: Order by date or any other criteria
  //   });

  //   return { incomingTransactions, outgoingTransactions };
  // }
}
