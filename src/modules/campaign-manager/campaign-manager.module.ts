import { Module } from "@nestjs/common";
import { CampaignManagerService } from "./campaign-manager.service";
import { CampaignManagerController } from "./campaign-manager.controller";
import { SharedModule } from "src/shared/shared.module";
import { MailsModule } from "../mails/mails.module";
import { S3Module } from "../s3/s3.module";

@Module({
  imports: [SharedModule, MailsModule, S3Module],
  controllers: [CampaignManagerController],
  providers: [CampaignManagerService],
})
export class CampaignManagerModule {}
