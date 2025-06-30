import { Test, TestingModule } from '@nestjs/testing';
import { GuestUserController } from './guest-user.controller';
import { GuestUserService } from './guest-user.service';

describe('GuestUserController', () => {
  let controller: GuestUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestUserController],
      providers: [GuestUserService],
    }).compile();

    controller = module.get<GuestUserController>(GuestUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
