import { Test, TestingModule } from "@nestjs/testing";
import { NgoController } from "./ngo.controller";
import { NgoService } from "./ngo.service";

describe("NgoController", () => {
  let controller: NgoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NgoController],
      providers: [NgoService],
    }).compile();

    controller = module.get<NgoController>(NgoController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
