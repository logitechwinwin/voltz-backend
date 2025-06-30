import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { User, UserRoles } from "../user/user.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { FormDataRequest } from "nestjs-form-data";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { IResponse } from "src/shared/interfaces/response.interface";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { GetAllProductsDto } from "./dto/get-all-products.dto";

@Controller("product")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  @FormDataRequest()
  async create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: User): Promise<IResponse> {
    const product = await this.productService.create(createProductDto, user);
    return {
      message: "Product created successfully",
      details: product,
    };
  }

  @Get()
  @UseGuards(AuthenticationGuard, RolesGuard)
  async findAll(@Query() queryData: GetAllProductsDto): Promise<IResponse> {
    const products = await this.productService.findAll(queryData);
    return {
      message: "Products fetched successfully",
      details: products,
    };
  }

  @Get(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  async findOne(@CurrentUser() user: User, @Param() paramData: ParamIdDto): Promise<IResponse> {
    const product = await this.productService.findOne(paramData.id, user);
    return {
      message: "Product fetched successfully",
      details: product,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  @FormDataRequest()
  async update(@CurrentUser() user: User, @Param() paramData: ParamIdDto, @Body() updateProductDto: UpdateProductDto) {
    const updatedProduct = await this.productService.update(paramData.id, updateProductDto, user);
    return {
      message: "Product updated successfully",
      details: updatedProduct,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.COMPANY)
  async delete(@Param() paramData: ParamIdDto) {
    const product = await this.productService.delete(paramData.id);
    return {
      message: "Product deleted successfully",
      details: product,
    };
  }
}
