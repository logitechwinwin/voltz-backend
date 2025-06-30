import { Test, TestingModule } from "@nestjs/testing";
import { LifeStageService } from "./life-stage.service";

describe("LifeStageService", () => {
  let service: LifeStageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LifeStageService],
    }).compile();

    service = module.get<LifeStageService>(LifeStageService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
