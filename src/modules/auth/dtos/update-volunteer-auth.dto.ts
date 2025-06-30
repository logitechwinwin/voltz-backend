import { PartialType } from "@nestjs/mapped-types";
import { CreateVolunteerAuthDto } from "./create-volunteer-auth.dto";

export class UpdateVolunteerAuthDto extends PartialType(CreateVolunteerAuthDto) {}
