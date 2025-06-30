import { Test, TestingModule } from "@nestjs/testing";
import { VolunteerRequestService } from "./volunteer-request.service";

describe("VolunteerRequestService", () => {
  let service: VolunteerRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VolunteerRequestService],
    }).compile();

    service = module.get<VolunteerRequestService>(VolunteerRequestService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
