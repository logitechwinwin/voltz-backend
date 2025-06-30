import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from "@nestjs/common";
import { FoundationalVoltzService } from "./foundational-voltz.service";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { User } from "../user/user.entity";
import { IResponse } from "src/shared/interfaces/response.interface";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { CreateUserBuysPaymentIntentDto } from "./dto/create-user-buys-payment-intent.dto";
import { verifyPaymentDto } from "../ngo/dto/verify-payment.dto";
import { CreateGuestBuysPaymentIntentDto } from "./dto/create-guest-buys-payment-intent.dto";
import { GetAllVoltzPurchasingDto } from "./dto/get-all-voltz-purchasing.dto";

@Controller("foundational-voltz")
export class FoundationalVoltzController {
  constructor(private readonly foundationalVoltzService: FoundationalVoltzService) {}

  @Post("user-buys")
  @UseGuards(AuthenticationGuard)
  async createUserBuysPaymentIntent(
    @CurrentUser() user: User,
    @Body() createUserBuysPaymentIntentDto: CreateUserBuysPaymentIntentDto,
    @Req() req: Request,
  ): Promise<IResponse> {
    const formUrl = await this.foundationalVoltzService.createUserBuysPaymentIntent(
      req,
      user,
      createUserBuysPaymentIntentDto,
    );
    return {
      message: "Foundational Voltz purchasing request has been created.",
      details: {
        formUrl,
      },
    };
  }

  @Post("user-verify-payment")
  @UseGuards(AuthenticationGuard)
  async verifyPayment(@CurrentUser() user: User, @Body() verifyPaymentData: verifyPaymentDto): Promise<IResponse> {
    await this.foundationalVoltzService.verifyPayment(user, verifyPaymentData.tokenId);
    return {
      message:
        "Payment for your voltz purchase has been successfully completed. Thank for purchasing foundational voltz",
    };
  }

  @Post("guest-buys")
  async createGuestBuysPaymentIntent(
    @Body() createGuestBuysPaymentIntentDto: CreateGuestBuysPaymentIntentDto,
    @Req() req: Request,
  ): Promise<IResponse> {
    const formUrl = await this.foundationalVoltzService.createGuestBuysPaymentIntent(
      createGuestBuysPaymentIntentDto,
      req,
    );
    return {
      message: "Foundational Voltz purchasing request has been created.",
      details: {
        formUrl,
      },
    };
  }

  @Post("guest-verify-payment")
  async verifyGuestPayment(@Body() verifyPaymentData: verifyPaymentDto): Promise<IResponse> {
    await this.foundationalVoltzService.verifyGuestPayment(verifyPaymentData);
    return {
      message:
        "Payment for your voltz purchase has been successfully completed. Thank for purchasing foundational voltz",
    };
  }

  @Get()
  async findAll(@Query() getAllVoltzPurchasingDto: GetAllVoltzPurchasingDto): Promise<IResponse> {
    const voltzPurchasingData = await this.foundationalVoltzService.findAll(getAllVoltzPurchasingDto);

    const totalFoundationalVoltzSellout = await this.foundationalVoltzService.calculateTotalFoundationalVoltzSellout();
    voltzPurchasingData.meta.totalVoltzSellout = totalFoundationalVoltzSellout;
    voltzPurchasingData.meta.totalVoltzSelloutTarget = 10000;

    return {
      message: "Voltz purchasing fetched successfully",
      details: voltzPurchasingData,
    };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.foundationalVoltzService.findOne(+id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.foundationalVoltzService.remove(+id);
  }
}
