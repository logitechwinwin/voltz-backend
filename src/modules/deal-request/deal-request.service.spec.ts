import { Test, TestingModule } from "@nestjs/testing";
import { DealRequestService } from "./deal-request.service";

describe("DealRequestService", () => {
  let service: DealRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DealRequestService],
    }).compile();

    service = module.get<DealRequestService>(DealRequestService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
