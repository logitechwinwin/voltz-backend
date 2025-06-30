import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { ActivationChangeLogService } from "./activation-change-log.service";
import { CreateActivationChangeLogDto } from "./dto/create-activation-change-log.dto";
import { UpdateActivationChangeLogDto } from "./dto/update-activation-change-log.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { UserRoles } from "../user/user.entity";
import { GetAllActivationChangeLogDto } from "./dto/get-all-activation-change-log.dto";
import { IResponse } from "src/shared/interfaces/response.interface";

@Controller("activation-change-log")
export class ActivationChangeLogController {
  constructor(private readonly activationChangeLogService: ActivationChangeLogService) {}

  @Post()
  create(@Body() createActivationChangeLogDto: CreateActivationChangeLogDto) {
    return this.activationChangeLogService.create(createActivationChangeLogDto);
  }

  @Get()
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async findAll(@Query() getAllActivationChangeLogDto: GetAllActivationChangeLogDto): Promise<IResponse> {
    const { items, meta } = await this.activationChangeLogService.findAll(getAllActivationChangeLogDto);

    return {
      message: "Activation change logs fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.activationChangeLogService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateActivationChangeLogDto: UpdateActivationChangeLogDto) {
    return this.activationChangeLogService.update(+id, updateActivationChangeLogDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.activationChangeLogService.remove(+id);
  }
}
