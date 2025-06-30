import { PartialType } from '@nestjs/mapped-types';
import { CreateGuestUserDto } from './create-guest-user.dto';

export class UpdateGuestUserDto extends PartialType(CreateGuestUserDto) {}
