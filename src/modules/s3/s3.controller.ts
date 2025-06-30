import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common";
import { S3Service } from "./s3.service";
import { RolesDecorator } from "src/shared/guards/roles.decorator";
import { FormDataRequest } from "nestjs-form-data";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { UserRoles } from "../user/user.entity";
import { UploadImagesToS3Dto } from "./dtos/upload-images-s3.dto";
import { IResponse } from "src/shared/interfaces/response.interface";
import { UserS3Paths } from "src/static/s3-paths";

@Controller("s3")
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post("upload-multiple-images")
  @UseGuards(AuthenticationGuard, RolesGuard)
  @RolesDecorator(UserRoles.ADMIN)
  @FormDataRequest()
  async uploadImagesToS3(@Body() uploadImagesToS3Dto: UploadImagesToS3Dto): Promise<IResponse> {
    const uploadedImagesUrls = await this.s3Service.uploadMultipleFiles(
      uploadImagesToS3Dto.images,
      UserS3Paths.BANNER_IMAGE,
    );

    return {
      message: "Images Uploaded Successfully",
      details: uploadedImagesUrls,
    };
  }
}
