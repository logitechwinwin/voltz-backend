import { Test, TestingModule } from "@nestjs/testing";
import { SdgController } from "./sdg.controller";
import { SdgService } from "./sdg.service";

describe("SdgController", () => {
  let controller: SdgController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SdgController],
      providers: [SdgService],
    }).compile();

    controller = module.get<SdgController>(SdgController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
