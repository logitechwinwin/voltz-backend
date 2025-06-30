import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GuestUserService } from './guest-user.service';
import { CreateGuestUserDto } from './dto/create-guest-user.dto';
import { UpdateGuestUserDto } from './dto/update-guest-user.dto';

@Controller('guest-user')
export class GuestUserController {
  constructor(private readonly guestUserService: GuestUserService) {}

  @Post()
  create(@Body() createGuestUserDto: CreateGuestUserDto) {
    return this.guestUserService.create(createGuestUserDto);
  }

  @Get()
  findAll() {
    return this.guestUserService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.guestUserService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGuestUserDto: UpdateGuestUserDto) {
    return this.guestUserService.update(+id, updateGuestUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.guestUserService.remove(+id);
  }
}
