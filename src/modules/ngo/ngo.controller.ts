import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, Req, ParseIntPipe } from "@nestjs/common";
import { NgoService } from "./ngo.service";
import { CreateNgoDto } from "./dto/create-ngo.dto";
import { UpdateNgoDto } from "./dto/update-ngo.dto";
import { FormDataRequest } from "nestjs-form-data";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { User, UserRoles } from "../user/user.entity";
import { InjectUserToBody } from "src/decorators/req-injection.decorator";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { IResponse } from "src/shared/interfaces/response.interface";
import { GetAllNgoDto } from "./dto/get-all-ngo.dto";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { verifyPaymentDto } from "./dto/verify-payment.dto";

@Controller("ngo")
export class NgoController {
  constructor(private readonly ngoService: NgoService) {}

  @Post()
  create(@Body() createNgoDto: CreateNgoDto) {
    return this.ngoService.create(createNgoDto);
  }

  @Get("top-ngo-locations")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.VOLUNTEER)
  async findTopNgoLocations(): Promise<IResponse> {
    const location = await this.ngoService.findTopLocations();
    return {
      message: "Ngo location fetched successfully",
      details: location,
    };
  }

  @Post("voltzs-purchasing/initiate-payment")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  async initiatePayment(
    @CurrentUser() user: User,
    @Body() initiatePaymentData: InitiatePaymentDto,
    @Req() req: Request,
  ): Promise<IResponse> {
    const formUrl = await this.ngoService.initiatePayment(user, initiatePaymentData, req);
    return {
      message: "Voltz purchase payment request has been initiated.",
      details: {
        formUrl,
      },
    };
  }

  @Post("voltzs-purchasing/verify-payment")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO)
  async verifyPayment(@CurrentUser() user: User, @Body() verifyPaymentData: verifyPaymentDto): Promise<IResponse> {
    await this.ngoService.verifyPayment(user, verifyPaymentData.tokenId);
    return {
      message: "Payment for your voltz purchase has been successfully completed.",
    };
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  async getAll(@CurrentUser() user: User, @Query() queryData: GetAllNgoDto): Promise<IResponse> {
    const ngos = await this.ngoService.getAll(user, queryData);
    return {
      message: "Ngo fetched successfully",
      details: ngos,
    };
  }

  @Get("dashboard/stats/:ngoId")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.NGO, UserRoles.ADMIN)
  async getDashboardStats(
    @Param("ngoId", ParseIntPipe) ngoId: number,
    @CurrentUser() currentUser: User,
  ): Promise<IResponse> {
    const stats = await this.ngoService.getDashboardStats(ngoId, currentUser);

    return {
      message: "Dashboard data fetched successfully",
      details: stats,
    };
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  async get(@CurrentUser() user: User, @Param("id") ngoId: number): Promise<IResponse> {
    const ngo = await this.ngoService.get(ngoId, user);
    return {
      message: "Ngo fetched successfully",
      details: ngo,
    };
  }

  @Patch()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @InjectUserToBody()
  @RolesDecorator(UserRoles.NGO)
  @FormDataRequest()
  async update(@CurrentUser() user: User, @Body() updateNgoDto: UpdateNgoDto) {
    const { savedUser } = await this.ngoService.update(user, updateNgoDto);
    return {
      message: "Ngo updated successfully",
      details: savedUser,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @InjectUserToBody()
  @RolesDecorator(UserRoles.NGO, UserRoles.ADMIN)
  @FormDataRequest()
  async updateById(@Param() user, @Body() updateNgoDto: UpdateNgoDto) {
    const { savedUser } = await this.ngoService.update(user, updateNgoDto);
    return {
      message: "Ngo updated successfully",
      details: savedUser,
    };
  }
}
