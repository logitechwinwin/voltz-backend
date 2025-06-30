import { Test, TestingModule } from "@nestjs/testing";
import { SdgService } from "./sdg.service";

describe("SdgService", () => {
  let service: SdgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SdgService],
    }).compile();

    service = module.get<SdgService>(SdgService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
