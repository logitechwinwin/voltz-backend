import { DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MemoryStoredFile } from "nestjs-form-data";

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private nodeEnv: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get("aws.s3.region"),
      credentials: {
        accessKeyId: this.configService.get("aws.s3.accessKeyId"),
        secretAccessKey: this.configService.get("aws.s3.secretAccessKey"),
      },
    });
    this.bucketName = this.configService.get("aws.s3.bucketName");
    this.region = this.configService.get("aws.s3.region");
    this.nodeEnv = this.configService.get("nodeEnv");
  }

  async uploadFile(file: MemoryStoredFile, folderPath: string) {
    if (!file) {
      return;
    }

    const uploadParam = {
      Bucket: this.bucketName,
      Body: file.buffer,
      Key: `${this.nodeEnv}/${folderPath}/${Date.now()}-${file.originalName.split(" ").join("-")}`,
      ContentType: file.mimeType,
    };

    const response = await this.s3Client.send(new PutObjectCommand(uploadParam));

    if (response.$metadata.httpStatusCode === 200) {
      return `https://s3.${this.region}.amazonaws.com/${this.bucketName}/${uploadParam.Key}`;
    } else {
      throw new BadRequestException("Failed to upload file");
    }
  }

  async uploadMultipleFiles(files: MemoryStoredFile[], folderPath: string) {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map(async file => {
      const uploadParam = {
        Bucket: this.bucketName,
        Body: file.buffer,
        Key: `production/${folderPath}/${Date.now()}-${file.originalName.split(" ").join("-")}`,
        ContentType: file.mimeType,
      };
      return this.s3Client.send(new PutObjectCommand(uploadParam)).then(response => {
        if (response.$metadata.httpStatusCode === 200) {
          return `https://s3.${this.region}.amazonaws.com/${this.bucketName}/${uploadParam.Key}`;
        } else {
          throw new BadRequestException(`Failed to upload file: ${file.originalName}`);
        }
      });
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls;
  }

  async deleteFile(fileKey: string) {
    if (!fileKey) {
      return;
    }
    const deleteParams = {
      Bucket: this.bucketName,
      Key: fileKey,
    };

    await this.s3Client.send(new DeleteObjectCommand(deleteParams));
  }

  async deleteMultipleFiles(fileKeys: string[]) {
    if (!fileKeys || fileKeys.length === 0) {
      return;
    }

    const deleteParams = {
      Bucket: this.bucketName,
      Delete: {
        Objects: fileKeys.map(fileKey => ({
          Key: fileKey,
        })),
      },
    };

    await this.s3Client.send(new DeleteObjectsCommand(deleteParams));
  }
}
