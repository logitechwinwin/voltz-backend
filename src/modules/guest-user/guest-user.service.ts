import { Injectable } from '@nestjs/common';
import { CreateGuestUserDto } from './dto/create-guest-user.dto';
import { UpdateGuestUserDto } from './dto/update-guest-user.dto';

@Injectable()
export class GuestUserService {
  create(createGuestUserDto: CreateGuestUserDto) {
    return 'This action adds a new guestUser';
  }

  findAll() {
    return `This action returns all guestUser`;
  }

  findOne(id: number) {
    return `This action returns a #${id} guestUser`;
  }

  update(id: number, updateGuestUserDto: UpdateGuestUserDto) {
    return `This action updates a #${id} guestUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} guestUser`;
  }
}
