import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { LifeStageService } from "./life-stage.service";
import { CreateLifeStageDto } from "./dto/create-life-stage.dto";
import { UpdateLifeStageDto } from "./dto/update-life-stage.dto";
import { UserRoles } from "../user/user.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { IResponse } from "src/shared/interfaces/response.interface";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";

@Controller("life-stage")
export class LifeStageController {
  constructor(private readonly lifeStageService: LifeStageService) {}

  @Post()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async create(@Body() createLifeStageDto: CreateLifeStageDto): Promise<IResponse> {
    const createdLifeStage = await this.lifeStageService.create(createLifeStageDto);

    return {
      message: "Life stage added successfully",
      details: createdLifeStage,
    };
  }

  @Get()
  async findAll(@Query() getAllLifeStagesData: GetAllDto) {
    const { items, meta } = await this.lifeStageService.findAll(getAllLifeStagesData);

    return {
      message: "Life stages fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async update(@Param() paramData: ParamIdDto, @Body() updateLifeStageDto: UpdateLifeStageDto) {
    const updatedLifeStage = await this.lifeStageService.update(paramData.id, updateLifeStageDto);

    return {
      message: "Life stage updated successfully",
      details: updatedLifeStage,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async delete(@Param() paramData: ParamIdDto) {
    const deletedLifeStage = await this.lifeStageService.delete(paramData.id);
    return {
      message: "Topic deleted successfully",
      details: deletedLifeStage,
    };
  }
}
