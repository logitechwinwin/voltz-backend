import { Test, TestingModule } from '@nestjs/testing';
import { FoundationalVoltzController } from './foundational-voltz.controller';
import { FoundationalVoltzService } from './foundational-voltz.service';

describe('FoundationalVoltzController', () => {
  let controller: FoundationalVoltzController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoundationalVoltzController],
      providers: [FoundationalVoltzService],
    }).compile();

    controller = module.get<FoundationalVoltzController>(FoundationalVoltzController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
