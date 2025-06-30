import { Test, TestingModule } from "@nestjs/testing";
import { DealRequestController } from "./deal-request.controller";
import { DealRequestService } from "./deal-request.service";

describe("DealRequestController", () => {
  let controller: DealRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DealRequestController],
      providers: [DealRequestService],
    }).compile();

    controller = module.get<DealRequestController>(DealRequestController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
