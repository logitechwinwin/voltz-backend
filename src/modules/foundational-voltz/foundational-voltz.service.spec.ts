import { Test, TestingModule } from '@nestjs/testing';
import { FoundationalVoltzService } from './foundational-voltz.service';

describe('FoundationalVoltzService', () => {
  let service: FoundationalVoltzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoundationalVoltzService],
    }).compile();

    service = module.get<FoundationalVoltzService>(FoundationalVoltzService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
