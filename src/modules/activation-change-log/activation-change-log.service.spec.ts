import { Test, TestingModule } from '@nestjs/testing';
import { ActivationChangeLogService } from './activation-change-log.service';

describe('ActivationChangeLogService', () => {
  let service: ActivationChangeLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivationChangeLogService],
    }).compile();

    service = module.get<ActivationChangeLogService>(ActivationChangeLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
