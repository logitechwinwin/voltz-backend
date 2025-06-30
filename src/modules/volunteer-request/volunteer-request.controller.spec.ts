import { Test, TestingModule } from "@nestjs/testing";
import { VolunteerRequestController } from "./volunteer-request.controller";
import { VolunteerRequestService } from "./volunteer-request.service";

describe("VolunteerRequestController", () => {
  let controller: VolunteerRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VolunteerRequestController],
      providers: [VolunteerRequestService],
    }).compile();

    controller = module.get<VolunteerRequestController>(VolunteerRequestController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
