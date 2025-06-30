import { PartialType } from "@nestjs/mapped-types";
import { CreateCampaignManagerDto } from "./create-campaign-manager.dto";

export class UpdateCampaignManagerDto extends PartialType(CreateCampaignManagerDto) {}
