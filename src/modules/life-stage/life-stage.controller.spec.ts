import { Test, TestingModule } from "@nestjs/testing";
import { LifeStageController } from "./life-stage.controller";
import { LifeStageService } from "./life-stage.service";

describe("LifeStageController", () => {
  let controller: LifeStageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifeStageController],
      providers: [LifeStageService],
    }).compile();

    controller = module.get<LifeStageController>(LifeStageController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
