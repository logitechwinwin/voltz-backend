import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from "@nestjs/common";
import { SdgService } from "./sdg.service";
import { CreateSdgDto } from "./dto/create-sdg.dto";
import { UpdateSdgDto } from "./dto/update-sdg.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { FormDataRequest } from "nestjs-form-data";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { UserRoles } from "../user/user.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";

@Controller("sdgs")
export class SdgController {
  constructor(private readonly sdgService: SdgService) {}

  @Post()
  @FormDataRequest({
    fileSystemStoragePath: "public/sdgs",
  })
  async create(@Body() createSdgData: CreateSdgDto): Promise<IResponse> {
    const sdg = await this.sdgService.create(createSdgData);

    return {
      message: "Sdg created successfully",
      details: sdg,
    };
  }

  @Get()
  // @UseGuards(AuthenticationGuard, RolesGuard)
  // @RolesDecorator(UserRoles.ADMIN, UserRoles.NGO, UserRoles.VOLUNTEER)
  async findAll(@Query() queryData: GetAllDto): Promise<IResponse> {
    const { items, meta } = await this.sdgService.getAll(queryData);
    return {
      message: "Sdgs fetched successfully",
      details: items,
      extra: meta,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  @FormDataRequest({
    fileSystemStoragePath: "public/sdgs",
  })
  async update(@Param() paramData: ParamIdDto, @Body() updateSdgData: UpdateSdgDto) {
    const updatedSdg = await this.sdgService.update(paramData.id, updateSdgData);
    return {
      message: "Sdg updated successfully",
      details: updatedSdg,
    };
  }

  @Delete(":id")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  async delete(@Param() paramData: ParamIdDto): Promise<IResponse> {
    const sdg = await this.sdgService.delete(paramData.id);

    return {
      message: "Sdg deleted successfully",
      details: sdg,
    };
  }
}
