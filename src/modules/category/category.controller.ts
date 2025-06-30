import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { UserRoles } from "../user/user.entity";
import { IResponse } from "src/shared/interfaces/response.interface";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";

@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async createCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<IResponse> {
    const createdCategory = await this.categoryService.create(createCategoryDto);
    return {
      message: "Category created successfully",
      details: createdCategory,
    };
  }

  @Get()
  async getAllCategory(@Query() queryData: GetAllDto): Promise<IResponse> {
    const { items, meta } = await this.categoryService.findAll(queryData);
    return {
      message: "Categories fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async updateCategory(
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Param() paramData: ParamIdDto,
  ): Promise<IResponse> {
    const updatedCategory = await this.categoryService.update(updateCategoryDto, paramData.id);
    return {
      message: "Category updated successfully",
      details: updatedCategory,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async deleteCategory(@Param() paramData: ParamIdDto): Promise<IResponse> {
    await this.categoryService.remove(paramData.id);
    return {
      message: "Category deleted successfully",
    };
  }
}
