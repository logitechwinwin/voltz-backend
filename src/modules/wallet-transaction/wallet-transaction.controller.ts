import { Controller, Get, Query, UseGuards, Res } from "@nestjs/common";
import { WalletTransactionService } from "./wallet-transaction.service";
import { IResponse } from "src/shared/interfaces/response.interface";
import { GetAllWalletTransactionDto } from "./dto/get-all-wallet-transaction.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { User, UserRoles } from "../user/user.entity";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { Response } from "express";

@Controller("wallet-transaction")
export class WalletTransactionController {
  constructor(private readonly walletTransactionService: WalletTransactionService) {}

  @Get()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY, UserRoles.NGO, UserRoles.ADMIN)
  async getAllWalletTransactions(
    @CurrentUser() currentUser: User,
    @Query() getAllWalletTransactions: GetAllWalletTransactionDto,
  ): Promise<IResponse> {
    const walletTransactions = await this.walletTransactionService.getAllWalletTransactions(
      getAllWalletTransactions,
      currentUser,
    );
    return {
      message: "Wallet Transactions fetched successfully",
      details: walletTransactions.items,
      extra: walletTransactions.meta,
    };
  }

  @Get("download")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY, UserRoles.NGO, UserRoles.ADMIN)
  async downloadWalletTransactions(
    @CurrentUser() currentUser: User,
    @Query() getAllWalletTransactions: GetAllWalletTransactionDto,
    @Res() res: Response,
  ) {
    await this.walletTransactionService.downloadWalletTransactions(getAllWalletTransactions, currentUser, res);
  }
}
