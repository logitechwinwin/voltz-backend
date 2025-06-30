import { PartialType } from '@nestjs/mapped-types';
import { CreateActivationChangeLogDto } from './create-activation-change-log.dto';

export class UpdateActivationChangeLogDto extends PartialType(CreateActivationChangeLogDto) {}
