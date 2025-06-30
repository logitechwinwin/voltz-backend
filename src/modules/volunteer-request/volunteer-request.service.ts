import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { Event, EventType } from "src/modules/event/entities/event.entity";
import { User, UserRoles } from "src/modules/user/user.entity";
import { IsNull, MoreThan, Repository } from "typeorm";
import { NotificationService } from "./../notification/notification.service";
import { CreateVolunteerRequestDto } from "./dto/create-volunteer-request.dto";
import { GetAllVolunteerRequestDto } from "./dto/get-all-volunteer-requests.dto";
import { UpdateVolunteerRequestStatusDto } from "./dto/update-volunteer-request-status.dto";
import { VolunteerRequest, VolunteerRequestStatus } from "./entities/volunteer-request.entity";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { WalletTransactionService } from "../wallet-transaction/wallet-transaction.service";
import { WalletService } from "../wallet/wallet.service";
import { ActivationStatus } from "src/shared/enums";
import { CheckInDto } from "./dto/check-in.dto";
import { CheckOutDto } from "./dto/check-out.dto";
import * as moment from "moment";

@Injectable()
export class VolunteerRequestService {
  constructor(
    @InjectRepository(VolunteerRequest)
    private volunteerRequestRepository: Repository<VolunteerRequest>,

    @InjectRepository(Event)
    private eventRepository: Repository<Event>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    private readonly walletTransactionService: WalletTransactionService,

    private readonly walletService: WalletService,

    private readonly configService: ConfigService,

    private readonly notificationService: NotificationService,
  ) {}

  async createRequest(user: User, createVolunteerRequestData: CreateVolunteerRequestDto): Promise<VolunteerRequest> {
    const { eventId, quotedHours } = createVolunteerRequestData;
    const { id: userId } = user;

    const event = await this.eventRepository.findOne({
      where: {
        id: eventId,
        type: EventType.CAMPAIGN,
        activationStatus: ActivationStatus.ACTIVE,
        closed: null,
      },
      relations: ["registrations", "user", "campaignManager"],
    });

    if (!event) {
      throw new NotFoundException(`Event not found.`);
    }

    const currentDate = new Date();
    if (currentDate < event.startDate) {
      throw new BadRequestException("Cannot request for an event that is not started.");
    }

    if (event.closed || (event.endDate && currentDate > event.endDate)) {
      throw new BadRequestException("Cannot request for an event that is Expired or is closed.");
    }

    const isUserRegistered = await this.userRepository
      .createQueryBuilder("user")
      .innerJoin("user.registeredEvents", "event", "event.id = :eventId", { eventId })
      .where("user.id = :userId", { userId })
      .getRawOne();

    if (!isUserRegistered) {
      throw new BadRequestException("User is not registered for this event.");
    }

    const volunteerRequest = await this.volunteerRequestRepository.findOne({
      where: { user: { id: userId }, event: { id: event.id } },
    });

    if (volunteerRequest && volunteerRequest.status === VolunteerRequestStatus.PENDING) {
      throw new BadRequestException("Your request is currently under review. Please wait for approval.");
    }

    if (volunteerRequest && volunteerRequest.status === VolunteerRequestStatus.ACCEPTED) {
      throw new BadRequestException("Your request is already approved.");
    }

    if (volunteerRequest && volunteerRequest.status === VolunteerRequestStatus.REJECTED) {
      throw new BadRequestException(
        "Your previous request was rejected. Please contact the admin for further assistance.",
      );
    }

    // if you reaches here it means their is no volunteer request till now
    const newVolunteerRequest = this.volunteerRequestRepository.create({
      user: { id: userId } as User,
      event,
      quotedHours,
    });

    await this.volunteerRequestRepository.save(newVolunteerRequest);

    const notificationData = {
      title: `Volunteer request received for event ${event.title}`,
      message: `${user.firstName} ${user.lastName} has participated in the event and is requesting for voltz`,
      profile: user.profileImage,
      bannerImage: user.bannerImage,
      data: {
        notificationType: NotificationType.NEW_VOLUNTEER_REQUEST,
      },
    };

    // here event.user.id is the id of the creator of the event which is NGO
    await this.notificationService.sendNotificationToMultipleUsers(
      [event.user.id, event.campaignManager.id],
      notificationData,
    );

    return;
  }

  async checkIn(user: User, checkInDto: CheckInDto) {
    const { eventId } = checkInDto;
    console.log("CheckInDto:", checkInDto);

    const event = await this.eventRepository.findOne({
      where: {
        id: eventId,
        type: EventType.CAMPAIGN,
        activationStatus: ActivationStatus.ACTIVE,
        closed: null,
      },
      relations: ["registrations", "user", "campaignManager"],
    });

    if (!event) {
      throw new NotFoundException(`Event not found.`);
    }

    // Check if the user already has an active check-in for the same event
    const existingCheckIn = await this.volunteerRequestRepository.findOne({
      where: { user: { id: user.id }, event: { id: eventId }, checkOutAt: IsNull() },
    });

    if (existingCheckIn) {
      throw new BadRequestException("You already have an active check-in for this event.");
    }

    console.log("User ID:", user.id);
    console.log("Event ID:", eventId);
    const isUserRegistered = await this.userRepository
      .createQueryBuilder("user")
      .innerJoin("user.registeredEvents", "event", "event.id = :eventId", { eventId })
      .where("user.id = :userId", { userId: user.id })
      .getRawOne();

    if (!isUserRegistered) {
      throw new BadRequestException("You are not registered for this event.");
    }

    const currentDate = new Date();
    if (currentDate < event.startDate) {
      throw new BadRequestException("Cannot check-in, in an event that is not started.");
    }

    if (event.endDate && currentDate > event.endDate) {
      throw new BadRequestException("Can't check-in, in an event that is expired");
    }

    const { isWithinRadius } = await this.eventRepository
      .createQueryBuilder("event")
      .select("ST_DWithin(event.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), event.radius)", "isWithinRadius")
      .where("event.id = :eventId", { eventId })
      .setParameters({ lng: checkInDto.longitude, lat: checkInDto.latitude })
      .getRawOne();

    if (!isWithinRadius) {
      throw new BadRequestException("Out of location");
    }

    const volunteerRequest = this.volunteerRequestRepository.create({
      user: user,
      event: event,
      checkInAt: new Date(),
      checkInLocation: {
        type: "Point",
        coordinates: [checkInDto.longitude, checkInDto.latitude],
      },
      status: VolunteerRequestStatus.CHECKED_IN,
    });

    return this.volunteerRequestRepository.save(volunteerRequest);
  }

  async checkOut(user: User, checkOutDto: CheckOutDto) {
    const { eventId } = checkOutDto;

    const event = await this.eventRepository.findOne({
      where: {
        id: eventId,
        type: EventType.CAMPAIGN,
        activationStatus: ActivationStatus.ACTIVE,
        closed: null,
      },
      relations: ["registrations", "user", "campaignManager"],
    });

    if (!event) {
      throw new NotFoundException(`Event not found.`);
    }

    const existingCheckIn = await this.volunteerRequestRepository.findOne({
      where: { user: { id: user.id }, event: { id: eventId }, checkOutAt: IsNull() },
    });

    if (!existingCheckIn) {
      throw new BadRequestException("You do not have an active check-in for this event.");
    }

    // If required, you can also check if the user is still within the event location before allowing checkout
    const { isWithinRadius } = await this.eventRepository
      .createQueryBuilder("event")
      .select("ST_DWithin(event.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), event.radius)", "isWithinRadius")
      .where("event.id = :eventId", { eventId })
      .setParameters({ lng: checkOutDto.longitude, lat: checkOutDto.latitude })
      .getRawOne();

    const totalDurationInHours = moment().diff(moment(existingCheckIn.checkInAt), "h", true); // ** true means return hours with decimal places

    existingCheckIn.quotedHours = parseFloat(totalDurationInHours.toFixed(2));
    existingCheckIn.isCheckoutWithinRadius = isWithinRadius;
    existingCheckIn.checkOutAt = new Date();
    existingCheckIn.checkOutLocation = {
      type: "Point",
      coordinates: [checkOutDto.longitude, checkOutDto.latitude],
    };
    existingCheckIn.status = VolunteerRequestStatus.PENDING; // ** pending means checkout

    const notificationData = {
      title: `Volunteer request received for event ${event.title}`,
      message: `${user.firstName} ${user.lastName} has participated in the event and is requesting for voltz`,
      profile: user.profileImage,
      bannerImage: user.bannerImage,
      data: {
        notificationType: NotificationType.NEW_VOLUNTEER_REQUEST,
      },
    };

    // here event.user.id is the id of the creator of the event which is NGO
    await this.notificationService.sendNotificationToMultipleUsers(
      [event.user.id, event.campaignManager.id],
      notificationData,
    );

    return this.volunteerRequestRepository.save(existingCheckIn);
  }

  async updateRequestStatus(
    user: User,
    requestId: number,
    updateVolunteerRequestData: UpdateVolunteerRequestStatusDto,
  ): Promise<void> {
    const request = await this.volunteerRequestRepository.findOne({
      where: { id: requestId, event: { activationStatus: ActivationStatus.ACTIVE } },
      relations: {
        user: { wallet: true },
        event: { user: { wallet: true }, campaignManager: true }, // ** user is the creator of the event
      },
    });

    if (!request) {
      throw new BadRequestException("Volunteer request not found, or the event has been marked inactive");
    }

    if (request.status === VolunteerRequestStatus.ACCEPTED) {
      throw new BadRequestException("Volunteer request is already accepted");
    }

    if (user.role === UserRoles.NGO && user.id !== request.event?.user.id) {
      throw new BadRequestException("Request doesn't belong to you");
    }

    if (user.role === UserRoles.CAMPAIGN_MANAGER && user.id !== request.event.campaignManager.id) {
      throw new BadRequestException("You are not the manager of this event request");
    }

    if (updateVolunteerRequestData.status === VolunteerRequestStatus.REJECTED) {
      request.status = updateVolunteerRequestData.status;

      await this.volunteerRequestRepository.save(request);

      const notificationData = {
        title: "Voltz Request Rejected",
        message:
          "We regret to inform you that your Voltz request has been rejected. If you have any questions or need further assistance, please feel free to contact our support team.",
        profileImage: "",
        bannerImage: "",
        data: {
          notificationType: NotificationType.VOLTZ_REQUEST_STATUS,
        },
      };

      return await this.notificationService.sendNotification(request?.user, notificationData);
    }

    request.status = updateVolunteerRequestData.status;
    request.actualHours = parseFloat(updateVolunteerRequestData.actualHours.toFixed(2));
    request.voltzGiven = parseFloat((request.actualHours * request.event.voltzPerHour).toFixed(2));

    // ** No matter who accepts (campaign_manager or ngo) the request the voltz will be deducted from the ngo who created the event
    await this.walletService.transferBetweenWallets({
      sourceWallet: request.event.user.wallet, // ** event creator's wallet
      targetWallet: request.user.wallet, // ** requestor's wallet
      amount: request.voltzGiven,
      event: request.event,
      ...(user.role === UserRoles.CAMPAIGN_MANAGER && { campaignManager: user }),
    });

    await this.volunteerRequestRepository.save(request);

    const notificationData = {
      title: "Voltz Request Approved",
      message:
        "Great news! Your Voltz request has been successfully approved. If you have any questions or need further assistance, feel free to reach out to our support team.",
      profileImage: "",
      bannerImage: "",
      data: {
        notificationType: NotificationType.VOLTZ_REQUEST_STATUS,
      },
    };

    return await this.notificationService.sendNotification(request?.user, notificationData);
  }

  async getRequestsByEvent(getAllVolunteerRequestDto: GetAllVolunteerRequestDto, user: User) {
    const { page, perPage, status, eventId } = getAllVolunteerRequestDto;

    const queryBuilder = this.volunteerRequestRepository
      .createQueryBuilder("volunteerRequest")
      .leftJoinAndSelect("volunteerRequest.user", "requestor")
      .leftJoinAndSelect("volunteerRequest.event", "event")
      .leftJoin("event.campaignManager", "campaignManager")
      .leftJoin("event.user", "eventCreator");

    if (user.role === UserRoles.NGO) {
      queryBuilder.where("eventCreator.id =:ngoId", { ngoId: user.id });
    } else if (user.role === UserRoles.CAMPAIGN_MANAGER) {
      queryBuilder.where("campaignManager.id = :campaignManagerId", { campaignManagerId: user.id });
    }

    if (eventId) {
      queryBuilder.andWhere("event.id =:eventId", { eventId });
    }

    if (status) {
      queryBuilder.andWhere("volunteerRequest.status =:requestStatus", { requestStatus: status });
    }

    queryBuilder.orderBy("volunteerRequest.createdAt", "DESC");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate(queryBuilder, paginationOptions);
  }

  async getRequestById(requestId: number): Promise<VolunteerRequest> {
    return this.volunteerRequestRepository.findOneByOrFail({ id: requestId });
  }

  async calculateWorkingHours(userId: number, from?: Date, to?: Date): Promise<number> {
    const query = this.volunteerRequestRepository
      .createQueryBuilder("volunteerRequest")
      .select("SUM(volunteerRequest.actualHours)", "sum")
      .where("volunteerRequest.userId = :userId", { userId })
      .andWhere("volunteerRequest.status = :status", { status: VolunteerRequestStatus.ACCEPTED });

    if (from && to) {
      query.andWhere("volunteerRequest.createdAt BETWEEN :from AND :to", { from, to });
    }

    const totalHours = await query.getRawOne();
    return totalHours.sum || 0;
  }

  async findByIdAndUser(id: number, user: User): Promise<VolunteerRequest> {
    const volunteerRequest = await this.volunteerRequestRepository.findOne({
      where: { id, user: { id: user.id } },
      relations: ["user"],
    });
    if (!volunteerRequest) {
      throw new NotFoundException("Volunteer request not found");
    }
    if (volunteerRequest.user.id !== user.id) {
      throw new ForbiddenException("You do not have access to this volunteer request");
    }
    return volunteerRequest;
  }
}
