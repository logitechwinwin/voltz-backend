import { Test, TestingModule } from '@nestjs/testing';
import { CampaignManagerService } from './campaign-manager.service';

describe('CampaignManagerService', () => {
  let service: CampaignManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignManagerService],
    }).compile();

    service = module.get<CampaignManagerService>(CampaignManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
