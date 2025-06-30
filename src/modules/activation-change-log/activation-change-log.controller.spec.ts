import { Test, TestingModule } from '@nestjs/testing';
import { ActivationChangeLogController } from './activation-change-log.controller';
import { ActivationChangeLogService } from './activation-change-log.service';

describe('ActivationChangeLogController', () => {
  let controller: ActivationChangeLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivationChangeLogController],
      providers: [ActivationChangeLogService],
    }).compile();

    controller = module.get<ActivationChangeLogController>(ActivationChangeLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
