import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  UseInterceptors,
} from "@nestjs/common";
import { CompanyService } from "./company.service";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { FormDataRequest } from "nestjs-form-data";
import { InjectUserToBody } from "src/decorators/req-injection.decorator";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { User, UserRoles } from "../user/user.entity";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { GetAllCompaniesDto } from "./dto/get-all-companies.dto";
import { RoleBasedResponseSerializer } from "src/shared/interceptors/role-based-response.interceptor";
import { CompanyDto } from "./responses/company.dto";
import { DonateVoltzToNgoDto } from "./dto/donate-voltz-to-ngo.dto";

@Controller("company")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get(":id")
  @UseInterceptors(new RoleBasedResponseSerializer(CompanyDto))
  @UseGuards(OptionalAuthGuard)
  async findOne(@CurrentUser() user: User, @Param() paramData: ParamIdDto): Promise<IResponse> {
    const company = await this.companyService.findOne(paramData.id, user);
    return {
      message: "Company fetched successfully",
      details: company,
    };
  }

  @Post("donate-voltz-to-ngo")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  async donateVoltzToNgo(@CurrentUser() user: User, @Body() donateVoltzToNgoDto: DonateVoltzToNgoDto) {
    const ngo = await this.companyService.donateVoltzToNgo(user, donateVoltzToNgoDto);

    return {
      message: "Voltz donated successfully to ngo",
      details: ngo,
    };
  }

  @Patch()
  @InjectUserToBody()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  @FormDataRequest()
  async update(@CurrentUser() user: User, @Body() updateCompanyDto: UpdateCompanyDto) {
    const { ...userData } = updateCompanyDto;
    const { savedUser } = await this.companyService.update(user, userData);

    return {
      message: "Company updated successfully",
      details: savedUser,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  @InjectUserToBody()
  @FormDataRequest()
  async updateById(@Param() user: { id: number }, @Body() updateCompanyDto: UpdateCompanyDto) {
    const { ...userData } = updateCompanyDto;
    const { savedUser } = await this.companyService.update(user as User, userData);

    return {
      message: "Company updated successfully",
      details: savedUser,
    };
  }

  @Get()
  async getAll(@Query() queryData: GetAllCompaniesDto): Promise<IResponse> {
    const companies = await this.companyService.getAll(queryData);
    return {
      message: "Companies fetched successfully",
      details: companies,
    };
  }

  @Get("dashboard/stats/:companyId")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY, UserRoles.ADMIN)
  async getDashboardStats(
    @Param("companyId", ParseIntPipe) companyId: number,
    @CurrentUser() currentUser: User,
  ): Promise<IResponse> {
    const stats = await this.companyService.getDashboardStats(companyId, currentUser);

    return {
      message: "Stats fetched successfully",
      details: stats,
    };
  }
}
