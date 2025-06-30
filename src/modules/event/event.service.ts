import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as moment from "moment";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { Brackets, In, IsNull, MoreThan, QueryBuilder, Repository, SelectQueryBuilder } from "typeorm";
import { Donation, DonationStatuses } from "../donation/entities/donation.entity";
import { LifeStage } from "../life-stage/entities/life-stage.entity";
import { NotificationService } from "../notification/notification.service";
import { S3Service } from "../s3/s3.service";
import { Sdg } from "../sdg/entities/sdg.entity";
import { Topic } from "../topic/entities/topic.entity";
import { User, UserRoles } from "../user/user.entity";
import { VolunteerRequest, VolunteerRequestStatus } from "../volunteer-request/entities/volunteer-request.entity";

import { CreateEventDto } from "./dto/create-event.dto";
import { GetAllEventsDto } from "./dto/get-all.dto";
import { GetEventStatsDto } from "./dto/get-event-stats.dto";
import { GetVolunteerRegisteredDto } from "./dto/get-volunteer-registered.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { Event, EventType } from "./entities/event.entity";
import { RegisterForEventDto } from "./entities/register-for-event.dto";
import { EventS3Paths } from "src/static/s3-paths";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { ChangeActivationStatusDto } from "./dto/change-activation-status.dto";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";
import { ActivationStatus } from "src/shared/enums";
import { EventQueryHelper } from "./event.query.helper";
import { FollowService } from "../follow/follow.service";
import { LocationService } from "src/shared/services/location.service";
import { ValidationException } from "src/utils/formate-validation-exception";

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Sdg)
    private readonly sdgRepository: Repository<Sdg>,
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
    @InjectRepository(LifeStage)
    private readonly lifeStageRepository: Repository<LifeStage>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(ActivationChangeLog)
    private readonly activationChangeLogRepository: Repository<ActivationChangeLog>,
    @InjectRepository(VolunteerRequest)
    private volunteerRequestRepository: Repository<VolunteerRequest>,

    private readonly s3Service: S3Service,

    private readonly followService: FollowService,

    private readonly notificationService: NotificationService,

    private readonly locationService: LocationService,
  ) {}

  async sendNotificationToInterestedUsers(userIds: number[], user: User, savedEvent: Event) {
    await this.notificationService.sendNotificationToMultipleUsers(userIds, {
      title: `🚨 New ${savedEvent.type} from ${user.name}!`,
      message: `Hi, ${user.name}, the organization just launched a new ${savedEvent.type}: ${savedEvent.title}!`,
      profileImage: user.profileImage,
      bannerImage: savedEvent.bannerImage,
      data: {
        notificationType: NotificationType.NEW_EVENT_CREATED,
        eventId: savedEvent.id,
        eventType: savedEvent.type,
      },
    });
  }

  async getInterestedUserByNgoData(
    topics: number[],
    city: string,
    country: string,
    state: string,
    lifeStages: number[],
    sdgs: number[],
  ) {
    return await this.usersRepository
      .createQueryBuilder("interestedUser")
      .leftJoinAndSelect("interestedUser.sdgs", "sdg")
      .leftJoinAndSelect("interestedUser.topics", "topics")
      .leftJoinAndSelect("interestedUser.lifeStages", "lifeStages")
      .leftJoinAndSelect("interestedUser.interestedLocations", "locations")
      .where("interestedUser.role = :role", { role: UserRoles.VOLUNTEER })
      .andWhere(
        new Brackets(qb => {
          let hasConditions = false;

          if (topics && topics.length > 0) {
            qb.where("topics.id IN (:...userTopics)", { userTopics: topics });
            hasConditions = true;
          }

          if (city || country || state) {
            qb.orWhere(
              new Brackets(qb => {
                if (city) {
                  qb.where("locations.city ILIKE :city", { city: `%${city}%` });
                }
                if (state) {
                  qb.orWhere("locations.state ILIKE :state", { state: `%${state}%` });
                }
                if (country) {
                  qb.orWhere("locations.country ILIKE :country", { country: `%${country}%` });
                }
              }),
            );

            hasConditions = true;
          }

          if (lifeStages && lifeStages.length > 0) {
            qb.orWhere("lifeStages.id IN (:...userLifeStages)", { userLifeStages: lifeStages });
            hasConditions = true;
          }

          if (sdgs && sdgs.length > 0) {
            qb.orWhere("sdg.id IN (:...sdgs)", { sdgs });
            hasConditions = true;
          }

          // If no conditions were added, force the query to return no results.
          if (!hasConditions) {
            qb.where("1 = 0");
          }
        }),
      )
      .getMany();
  }

  async create(createEventDto: CreateEventDto, user: User) {
    const { sdgs, bannerImage, topics, lifeStages, city, country, state, campaignManagerId, type } = createEventDto;
    console.log("called createNewData() function");
    if (createEventDto.donationRequired && createEventDto.donationRequired < 0) {
      throw new BadRequestException("Donation required can't be negative");
    }

    const [sdgsEntries, lifeStagesEntries, topicEntries, bannerImagePath] = await Promise.all([
      this.sdgRepository.find({ where: { id: In(sdgs) } }),
      this.lifeStageRepository.find({ where: { id: In(lifeStages) } }),
      this.topicsRepository.find({ where: { id: In(topics) } }),
      this.s3Service.uploadFile(bannerImage, EventS3Paths.BANNER_IMAGES),
    ]);
    console.log("EventRepository.create() function before...");
    const event = this.eventRepository.create({
      ...createEventDto,
      bannerImage: bannerImagePath,
      user: user,
      sdgs: sdgsEntries,
      lifeStages: lifeStagesEntries,
      topics: topicEntries,
    });
    console.log("EventRepository.create() function after...");
    if (type === EventType.CAMPAIGN) {
      const campaignManager = await this.usersRepository.findOne({
        where: { id: campaignManagerId, campaignManagerCreatedBy: { id: user.id } },
        relations: { campaignManagerCreatedBy: true },
      });

      if (!campaignManager) {
        throw new BadRequestException("Campaign Manager not found or doesn't belong to you");
      }

      event.campaignManager = campaignManager;
      console.log("Before call getLocationDetails() function...:: Campaign:::");
      const locationDetails = await this.locationService.getLocationDetails({
        placeId: createEventDto.placeId,
        latitude: createEventDto.latitude,
        longitude: createEventDto.longitude,
      });
      console.log("After call getLocationDetails() function... Campaign::: locationDetails:", locationDetails);
      event.country = locationDetails.country;
      event.state = locationDetails.state;
      event.city = locationDetails.city;
      event.address = locationDetails.formattedAddress;
      event.location = {
        type: "Point",
        coordinates: [locationDetails.longitude, locationDetails.latitude],
      };
      event.radius = createEventDto.radius;
    }

    const savedEvent = await event.save();

    const [ngoFollowers, interestedUsers] = await Promise.all([
      this.followService.generateGetFollowersQuery(user.id).getMany(),
      this.getInterestedUserByNgoData(topics, city, country, state, lifeStages, sdgs),
    ]);

    const userFollowersIds = ngoFollowers.map(eachFollower => eachFollower.id);

    const mergedUserIds = [...new Set([...interestedUsers.map(each => each.id), ...userFollowersIds])];

    if (mergedUserIds.length) {
      await this.sendNotificationToInterestedUsers(mergedUserIds, user, savedEvent);
    }

    return {
      ...savedEvent,
      user: {
        id: savedEvent.user.id,
        email: savedEvent.user.email,
        name: savedEvent.user.name,
        firstName: savedEvent.user.firstName,
        lastName: savedEvent.user.lastName,
        profileImage: savedEvent.user.profileImage,
      },
    };
  }

  async update(id: number, updateEventData: UpdateEventDto, user: User) {
    console.log("🚀 ~ EventService ~ update ~ updateEventData:", updateEventData)
    const event = await this.eventRepository.findOne({
      where: {
        id,
        user: {
          id: user.id,
        },
      },
      relations: ["sdgs", "topics", "lifeStages"],
    });

    if (!event) {
      throw new NotFoundException("Event does not exists");
    }

    if (event.type === EventType.CHARITY && (updateEventData.voltzPerHour || updateEventData.campaignManagerId)) {
      throw new BadRequestException("voltz per hour & campaign manager id is not allowed for charity");
    }

    if (updateEventData.endDate && updateEventData.endDate < event.startDate) {
      throw new ValidationException({ endDate: "End date should be after start date" });
    }

    if (updateEventData.donationRequired && updateEventData.donationRequired < event.donationReceived) {
      throw new BadRequestException("Donation required can not be less than donation received");
    }

    if (
      moment(event.startDate).isBefore(moment()) &&
      updateEventData.startDate &&
      moment(updateEventData.startDate).diff(event.startDate) !== 0
    ) {
      throw new BadRequestException("Event already started, hence start date can not be changed");
    }

    const volunteerRegisteredCount = await this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.registrations", "registration")
      .where("event.id = :eventId", { eventId: event.id })
      .getCount();

    if (updateEventData.volunteerRequired && updateEventData.volunteerRequired < volunteerRegisteredCount) {
      throw new ValidationException({
        volunteerRequired: "Volunteer required can't be less than volunteer already registered",
      });
    }

    const { sdgs, topics, lifeStages } = updateEventData;

    // Fetch related entities only if they are provided
    let sdgsEntries: Sdg[], lifeStagesEntries: LifeStage[], topicEntries: Topic[];

    if (sdgs && sdgs.length > 0) {
      sdgsEntries = await this.sdgRepository.find({
        where: { id: In(sdgs) },
      });
    }

    if (lifeStages && lifeStages.length > 0) {
      lifeStagesEntries = await this.lifeStageRepository.find({
        where: { id: In(lifeStages) },
      });
    }

    if (topics && topics.length > 0) {
      topicEntries = await this.topicsRepository.find({
        where: { id: In(topics) },
      });
    }

    // Preserve old bannerImage if not provided
    let bannerImage = event.bannerImage;
    if (updateEventData.bannerImage) {
      bannerImage = await this.s3Service.uploadFile(updateEventData.bannerImage, EventS3Paths.BANNER_IMAGES);
    }

    // Merge updates, preserving old data if new data is not provided
    Object.assign(event, {
      ...updateEventData,
      bannerImage,
      sdgs: sdgsEntries || event.sdgs,
      lifeStages: lifeStagesEntries || event.lifeStages,
      topics: topicEntries || event.topics,
    });

    if (
      event.type === EventType.CAMPAIGN &&
      (updateEventData.placeId || (updateEventData.latitude && updateEventData.longitude))
    ) {
      const locationDetails = await this.locationService.getLocationDetails({
        placeId: updateEventData.placeId,
        latitude: updateEventData.latitude,
        longitude: updateEventData.longitude,
      });

      event.country = locationDetails.country;
      event.state = locationDetails.state;
      event.city = locationDetails.city;
      event.address = locationDetails.formattedAddress;
      event.location = {
        type: "Point",
        coordinates: [locationDetails.longitude, locationDetails.latitude],
      };
      event.radius = updateEventData.radius;
    }

    if (event.type === EventType.CAMPAIGN && updateEventData.campaignManagerId) {
      const campaignManager = await this.usersRepository.findOne({
        where: { id: updateEventData.campaignManagerId, campaignManagerCreatedBy: { id: user.id } },
        relations: { campaignManagerCreatedBy: true },
      });

      if (!campaignManager) {
        throw new BadRequestException("Campaign Manager not found or doesn't belong to you");
      }

      event.campaignManager = campaignManager;
    }

    return this.eventRepository.save(event);
  }

  async toggleArchive(id: number, user: User) {
    const event = await this.eventRepository
      .createQueryBuilder("event")
      .where("event.id = :id", { id })
      .andWhere("event.userId = :userId", { userId: user.id })
      .getOne();

    if (!event) {
      throw new BadRequestException("Event doesn't exists");
    }

    event.closed = event.closed ? null : new Date();

    return await this.eventRepository.save(event);
  }

  async registerForEvent(user: User, registerForEventDto: RegisterForEventDto): Promise<Event> {
    const { eventId } = registerForEventDto;

    const event = await this.eventRepository.findOne({
      where: {
        id: eventId,
        type: EventType.CAMPAIGN,
        activationStatus: ActivationStatus.ACTIVE,
        endDate: MoreThan(new Date()),
        closed: null,
      },
      relations: ["registrations"],
    });

    if (!event) {
      throw new BadRequestException("Event is not available for registration");
    }

    if (event.volunteerRequired <= event.registrations.length) {
      throw new ConflictException("Event is not accepting any more volunteer");
    }

    const userData = await this.usersRepository.findOne({
      where: { id: user.id },
      relations: ["topics", "sdgs", "lifeStages", "interestedLocations"],
    });

    if (!userData) {
      throw new NotFoundException("User not found");
    }

    // Check if the user is already registered
    const isAlreadyRegistered = event.registrations.some(registration => registration.id === userData.id);

    if (isAlreadyRegistered) {
      throw new BadRequestException("You've already registered for this event");
    }

    // Add user to the registrations
    event.registrations.push(userData);

    // Save and return the updated event
    return await this.eventRepository.save(event);
  }

  async unregisterFromEvent(user: User, unregisterForEventDto: RegisterForEventDto): Promise<void> {
    const { eventId } = unregisterForEventDto;

    const event = await this.eventRepository.findOne({
      where: { id: eventId, type: EventType.CAMPAIGN, activationStatus: ActivationStatus.ACTIVE, closed: null },
      relations: ["registrations"],
    });

    if (!event) {
      throw new BadRequestException("Event is not available to unregister");
    }

    if (event.activationStatus === ActivationStatus.IN_ACTIVE) {
      throw new BadRequestException("Event is inactive");
    }

    const currentDate = new Date();
    if (event.startDate <= currentDate) {
      throw new BadRequestException("You cannot unregister from an event that has already started");
    }

    // Find the user in the registrations
    const registrationIndex = event.registrations.findIndex(registration => registration.id === user.id);

    if (registrationIndex === -1) {
      throw new BadRequestException("You are not registered for this event");
    }

    // Remove the user from the registrations
    event.registrations.splice(registrationIndex, 1);

    // Save the event with the updated registrations
    await this.eventRepository.save(event);
  }

  async getAll(queryData: GetAllEventsDto) {
    const {
      page,
      perPage,
      search,
      location,
      byUserInterest,
      sdgs,
      type,
      date,
      userId,
      ngoId,
      exceedAlreadyRegistered,
      donatedTo,
      volunteeredTo,
      excludeExpired,
      upcomingOnly,
      onGoingOnly,
      excludeUpcoming,
      excludeDonationComplete,
      exceptEventId,
      campaignManagerId,
      expiredOnly,
      archivedOnly,
      notArchivedOnly,
      activationStatus,
    } = queryData;
    const offset = (page - 1) * perPage;

    const baseQuery = this.eventRepository
      .createQueryBuilder("events")
      .leftJoinAndSelect("events.volunteerRequests", "volunteerRequest")
      .leftJoinAndSelect("events.donations", "donation")
      .leftJoinAndSelect("events.user", "user")
      .leftJoinAndSelect("events.sdgs", "sdg")
      .leftJoinAndSelect("events.topics", "topics")
      .leftJoinAndSelect("events.lifeStages", "lifeStages")
      .leftJoinAndSelect("events.registrations", "registrations")
      .leftJoinAndSelect("events.campaignManager", "campaign_manager")
      .leftJoinAndSelect("donation.user", "donator")
      .select([
        "events.*",
        "json_build_object('name', user.name, 'profileImage', user.profileImage, 'bannerImage', user.bannerImage, 'firstName', user.firstName, 'lastName', user.lastName) as user",
        "json_build_object('id', campaign_manager.id, 'email', campaign_manager.email, 'phoneNumber', campaign_manager.phoneNumber, 'profileImage', campaign_manager.profileImage, 'bannerImage', campaign_manager.bannerImage, 'firstName', campaign_manager.firstName, 'lastName', campaign_manager.lastName) as campaign_manager",
        `COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', sdg.id, 'label', sdg.label, 'image', sdg.image)) FILTER (WHERE sdg.id IS NOT NULL), '[]') as sdg`,
        "COALESCE(json_agg(DISTINCT jsonb_build_object('id', topics.id, 'label', topics.label)) FILTER (WHERE topics.id IS NOT NULL), '[]') as topics",
        `COALESCE(json_agg(DISTINCT jsonb_build_object('id', lifeStages.id, 'label', lifeStages.label)) FILTER (WHERE lifeStages.id IS NOT NULL), '[]') as "lifeStages"`,
        `(CASE WHEN COUNT(registrations.id) > 0 AND COUNT(registrations.id) FILTER (WHERE registrations.id = :givenUserId) > 0 THEN true ELSE false END) AS registered`,
        `(SELECT COUNT(*) FROM donation WHERE donation.eventId = events.id AND donation.status = 'completed') AS "donationsCount"`,
        `COUNT(DISTINCT registrations.id) AS "totalVolunteerRegistered"`,
        `ST_AsGeoJSON(events.location) AS location`,
        this.getRecentDonationsSubQuery(),
      ])
      .groupBy("events.id")
      .addGroupBy("user.id")
      .addGroupBy("campaign_manager.id")
      .setParameter("givenUserId", userId)
      .orderBy("events.createdAt", "DESC");

    if (activationStatus) {
      baseQuery.andWhere("events.activationStatus = :activationStatus", { activationStatus });
    }

    if (campaignManagerId) {
      baseQuery
        .leftJoin("events.campaignManager", "campaignManager")
        .andWhere("campaignManager.id = :campaignManagerId", { campaignManagerId: campaignManagerId });
    }

    if (exceptEventId) {
      baseQuery.andWhere("events.id != :exceptEventId", { exceptEventId: exceptEventId });
    }

    if (excludeExpired) {
      // ** basically we are filtering those which are not expired and are not closed
      baseQuery.andWhere(
        new Brackets(qb => {
          qb.where("events.endDate IS NULL OR events.endDate > :todayDate", { todayDate: new Date() }).andWhere(
            "events.closed IS NULL",
          );
        }),
      );
    }

    if (excludeUpcoming) {
      baseQuery.andWhere("events.startDate < :todayDate", { todayDate: new Date() });
    }

    if (excludeDonationComplete) {
      baseQuery.andWhere(
        new Brackets(qb => {
          qb.where("events.donationRequired IS NULL").orWhere(
            new Brackets(innerQb => {
              innerQb
                .where("events.donationRequired IS NOT NULL")
                .andWhere("events.donationReceived < events.donationRequired");
            }),
          );
        }),
      );
    }

    if (upcomingOnly) {
      baseQuery.andWhere(EventQueryHelper.buildUpcomingQuery(), { todayDate: new Date() });
    }

    if (onGoingOnly) {
      baseQuery.andWhere(EventQueryHelper.buildOngoingQuery(), {
        todayDate: new Date(),
        charity: EventType.CHARITY,
        campaign: EventType.CAMPAIGN,
      });
    }

    if (expiredOnly) {
      baseQuery.andWhere(EventQueryHelper.buildExpiredQuery(), {
        todayDate: new Date(),
        charity: EventType.CHARITY,
        campaign: EventType.CAMPAIGN,
      });
    }

    if (archivedOnly) {
      baseQuery.andWhere("events.closed IS NOT NULL");
    }

    if (notArchivedOnly) {
      baseQuery.andWhere("events.closed IS NULL");
    }

    if (volunteeredTo && userId) {
      this.getVolunteeredToQuery(baseQuery, userId);
    }

    // Apply common filters
    if (ngoId) baseQuery.andWhere("events.user.id = :ngoId", { ngoId });
    if (type) baseQuery.andWhere("events.type = :type", { type });
    if (search) baseQuery.andWhere("events.title ILIKE :search", { search: `%${search}%` });
    if (location) {
      baseQuery.andWhere(
        new Brackets(qb => {
          qb.where("events.city ILIKE :location", { location: `%${location}%` })
            .orWhere("events.state ILIKE :location", { location: `%${location}%` })
            .orWhere("events.country ILIKE :location", { location: `%${location}%` });
        }),
      );
    }
    if (sdgs?.length) baseQuery.andWhere("sdg.id IN (:...sdgs)", { sdgs });
    if (date) {
      baseQuery.andWhere(
        new Brackets(qb => {
          qb.where("events.startDate <= :date", { date }).andWhere("events.endDate >= :date", { date });
        }),
      );
    }

    if (userId && exceedAlreadyRegistered) {
      baseQuery.andWhere(
        `(SELECT COUNT(*) FROM event_registrations_user registrations
          WHERE registrations."eventId" = events.id AND registrations."userId" = :givenUserId) = 0`,
      );
    }

    if (donatedTo && userId) {
      baseQuery
        .andWhere(
          `EXISTS (
          SELECT 1
          FROM donation
          WHERE donation."eventId" = events.id
            AND donation."userId" = :givenUserId
            AND donation.status = 'completed'
        )`,
        )
        .addSelect(
          `(SELECT COALESCE(SUM(donation.amount), 0)
          FROM donation
          WHERE donation."eventId" = events.id
            AND donation."userId" = :givenUserId
            AND donation.status = 'completed'
        ) as "donatedAmountByYou"`,
        )
        .setParameter("givenUserId", userId);
    }

    let results = [];
    let totalItems = 0;

    if (userId && byUserInterest) {
      const { cities, states, countries, userTopics, userLifeStages, interestedLocations } =
        await this.getUserInterestedLocations(userId);

      const userInterestQuery = baseQuery.clone();

      userInterestQuery.andWhere(
        new Brackets(qb => {
          let hasConditions = false;

          if (userTopics && userTopics.length > 0) {
            qb.where("topics.id IN (:...userTopics)", { userTopics });
            hasConditions = true;
          }

          if ((cities && cities.length > 0) || (states && states.length > 0) || (countries && countries.length > 0)) {
            qb.orWhere(
              new Brackets(qb2 => {
                if (cities && cities.length > 0) {
                  qb2.where("events.city IN (:...cities)", { cities });
                  hasConditions = true;
                }
                if (states && states.length > 0) {
                  qb2.orWhere("events.state IN (:...states)", { states });
                  hasConditions = true;
                }
                if (countries && countries.length > 0) {
                  qb2.orWhere("events.country IN (:...countries)", { countries });
                  hasConditions = true;
                }
              }),
            );
          }

          if (userLifeStages && userLifeStages.length > 0) {
            qb.orWhere("lifeStages.id IN (:...userLifeStages)", { userLifeStages });
            hasConditions = true;
          }

          // If no conditions were added, force the query to return no results.
          if (!hasConditions) {
            qb.where("1 = 0");
          }
        }),
      );

      userInterestQuery.limit(perPage).offset(offset);

      const userInterestResults = await userInterestQuery.getRawMany();
      totalItems = await userInterestQuery.getCount();

      if (userInterestResults.length < perPage) {
        if (userInterestResults.length)
          baseQuery.andWhere("events.id NOT IN (:...filteredEventIds)", {
            filteredEventIds: userInterestResults.map(event => event.id),
          });

        baseQuery.limit(perPage - userInterestResults.length).offset(offset);
        const generalResults = await baseQuery.getRawMany();
        results = [...userInterestResults, ...generalResults];
        totalItems += await baseQuery.getCount();
      } else {
        results = userInterestResults;
        totalItems = await userInterestQuery.getCount();
      }
    } else {
      baseQuery.limit(perPage).offset(offset);
      results = await baseQuery.getRawMany();
      totalItems = await baseQuery.getCount();
    }

    const totalPages = Math.ceil(totalItems / perPage);
    const itemCount = results.length;

    return {
      items: results,
      meta: {
        totalItems,
        itemCount,
        itemsPerPage: perPage,
        totalPages,
        currentPage: page,
      },
    };
  }

  async get(eventId: number, userId: number) {
    const event = await this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.donations", "donation")
      .leftJoinAndSelect("event.user", "user")
      .leftJoinAndSelect("event.sdgs", "sdg")
      .leftJoinAndSelect("event.topics", "topics")
      .leftJoinAndSelect("event.lifeStages", "lifeStages")
      .leftJoinAndSelect("event.registrations", "registrations")
      .leftJoinAndSelect("donation.user", "donator")
      .leftJoinAndSelect("event.campaignManager", "campaignManager")
      .select([
        "event.*",
        `json_build_object('id', campaignManager.id ,'profileImage', campaignManager.profileImage, 'bannerImage', campaignManager.bannerImage, 'firstName', campaignManager.firstName, 'lastName', campaignManager.lastName) as "campaignManager"`,
        "json_build_object('name', user.name, 'profileImage', user.profileImage, 'bannerImage', user.bannerImage, 'firstName', user.firstName, 'lastName', user.lastName) as user",
        `COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', sdg.id, 'label', sdg.label, 'image', sdg.image)) FILTER (WHERE sdg.id IS NOT NULL), '[]') as sdg`,
        "COALESCE(json_agg(DISTINCT jsonb_build_object('id', topics.id, 'label', topics.label)) FILTER (WHERE topics.id IS NOT NULL), '[]') as topics",
        `COALESCE(json_agg(DISTINCT jsonb_build_object('id', lifeStages.id, 'label', lifeStages.label)) FILTER (WHERE lifeStages.id IS NOT NULL), '[]') as "lifeStages"`,
        `(CASE WHEN COUNT(registrations.id) > 0 AND COUNT(registrations.id) FILTER (WHERE registrations.id = :givenUserId) > 0 THEN true ELSE false END) AS registered`,
        // Calculate the count of completed donations
        `(SELECT COUNT(*) FROM donation WHERE donation.eventId = event.id AND donation.status = 'completed') AS "donationsCount"`,
        // Count the number of registrations (users who registered for the event)
        `COUNT(DISTINCT registrations.id) AS "totalVolunteerRegistered"`,
        // Get the first three completed donations
        `COALESCE(
      (
        SELECT json_agg(subquery.*)
        FROM (
          SELECT 
            donation.id AS id, 
            donation.amount AS amount, 
            donation.currency AS currency, 
            donation.status AS status, 
            donation.donatedAt AS donatedAt,
            json_build_object(
              'id', donator.id,
              'firstName', donator.firstName,
              'lastName', donator.lastName,
              'email', donator.email,
              'profileImage', donator."profileImage"
            ) AS user
          FROM donation
          LEFT JOIN "user" donator ON donation."userId" = donator.id
          WHERE donation."eventId" = event.id AND donation.status = 'completed'
          ORDER BY donation.donatedAt ASC
          LIMIT 10
        ) AS subquery
      ), 
      '[]'
    ) as donations`,
        `ST_AsGeoJSON(event.location) AS location`,
      ])
      .groupBy("event.id")
      .addGroupBy("user.id")
      .addGroupBy("campaignManager.id")
      .setParameter("givenUserId", userId)
      .where("event.id = :id", { id: eventId })
      .getRawOne();

    if (!event) {
      throw new NotFoundException("Event does not exist");
    }

    if (userId) {
      const checkIn = await this.volunteerRequestRepository.findOne({
        where: { user: { id: userId }, event: { id: eventId }, checkOutAt: IsNull() },
      });

      event.checkIn = checkIn;
    }

    return event; // Return the event if found
  }

  async getUserInterestedLocations(userId: number) {
    const { interestedLocations, topics, lifeStages } = await this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.topics", "topics")
      .leftJoinAndSelect("user.lifeStages", "lifeStages")
      .leftJoinAndSelect("user.interestedLocations", "interestedLocations")
      .where("user.id = :userId", { userId })
      .getOne();

    const cities = interestedLocations.map(each => each.city);
    const states = interestedLocations.map(each => each.state);
    const countries = interestedLocations.map(each => each.country);
    const userTopics = topics.map(each => each.id);
    const userLifeStages = lifeStages.map(each => each.id);

    return { cities, states, countries, interestedLocations, userTopics, userLifeStages };
  }

  async getEventStats(getEventStats: GetEventStatsDto, eventId: number) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: { campaignManager: true },
    });

    if (!event) {
      throw new NotFoundException("Event doesn't exists or event doesn't belong to you");
    }

    const eventStats = await this.eventRepository
      .createQueryBuilder("event")
      .leftJoin("event.registrations", "registrations")
      .leftJoin("event.volunteerRequests", "participations")
      .leftJoin("event.donations", "donations")
      .select("COUNT(DISTINCT registrations.id)", "totalRegistrations")
      .addSelect(
        "COUNT(DISTINCT CASE WHEN participations.status = :acceptedStatus THEN participations.id END)",
        "totalParticipation",
      )
      .addSelect(
        "SUM(DISTINCT CASE WHEN participations.status = :acceptedStatus THEN participations.actualHours * event.voltzPerHour END)",
        "voltzSpent",
      )
      .addSelect(
        "COUNT(DISTINCT CASE WHEN donations.status = :completedStatus THEN donations.id END)",
        "totalDonations",
      )
      .where("event.id = :eventId", { eventId: eventId })
      .groupBy("event.id")
      .setParameters({ completedStatus: DonationStatuses.COMPLETED, acceptedStatus: VolunteerRequestStatus.ACCEPTED })
      .getRawOne();

    return {
      totalRegistration: +eventStats.totalRegistrations,
      totalParticipation: +eventStats.totalParticipation,
      voltzSpent: +eventStats.voltzSpent,
      totalDonation: +eventStats.totalDonations,
      donationReceived: event.donationReceived,
      donationRequired: event.donationRequired,
      event: event,
    };
  }

  async getVolunteerRegistered(getVolunteerRegisteredDto: GetVolunteerRegisteredDto, eventId: number) {
    const { page, perPage } = getVolunteerRegisteredDto;
    const registeredVolunteerQuery = this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.registeredEvents", "registeredEvents")
      .select(["user"])
      .where("registeredEvents.id = :eventId", { eventId: eventId });

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };
    return paginate(registeredVolunteerQuery, paginationOptions);
  }

  async changeActivationStatus(
    eventId: number,
    currentUser: User,
    changeActivationStatusDto: ChangeActivationStatusDto,
  ) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException("Event does not exists");
    }

    if (event.activationStatus === changeActivationStatusDto.status) {
      throw new BadRequestException(`Event is already ${event.activationStatus}`);
    }

    event.activationStatus = changeActivationStatusDto.status;
    await this.eventRepository.save(event);

    const activationChangeLog = this.activationChangeLogRepository.create({
      event: event,
      admin: currentUser,
      reason: changeActivationStatusDto.reason,
      status: changeActivationStatusDto.status,
    });

    await this.activationChangeLogRepository.save(activationChangeLog);
  }

  // Helper functions
  private getRecentDonationsSubQuery() {
    return `
    COALESCE(
      (
        SELECT json_agg(subquery.*)
        FROM (
          SELECT donation.id AS id, donation.amount AS amount, donation.currency AS currency, 
            donation.status AS status, donation.donatedAt AS donatedAt,
            json_build_object('id', donator.id, 'firstName', donator.firstName, 'lastName', donator.lastName, 
            'email', donator.email, 'profileImage', donator."profileImage") AS user
          FROM donation
          LEFT JOIN "user" donator ON donation."userId" = donator.id
          WHERE donation."eventId" = events.id AND donation.status = 'completed'
          ORDER BY donation."donatedAt" DESC
          LIMIT 3
        ) AS subquery
      ), '[]'
    ) as donations
  `;
  }

  private getVolunteeredToQuery(baseQuery: SelectQueryBuilder<Event>, userId: number) {
    baseQuery
      .addSelect(
        `
          MIN(
            CASE
              -- Attended: if the user has an accepted volunteer request
              WHEN "volunteerRequest"."userId" = :givenUserId 
                AND "volunteerRequest".status = :acceptedStatus THEN 'attended'
    
              -- Missed: if the user registered but was not accepted, and the event has ended or is closed
              WHEN "registrations"."id" = :givenUserId
                AND ("volunteerRequest"."id" IS NULL OR "volunteerRequest".status != :acceptedStatus)
                AND (events.endDate IS NOT NULL AND (events.endDate < :todayDate OR events.closed IS NOT NULL))
              THEN 'missed'
    
              -- Registered: if the user is registered but has no accepted volunteer request or has no request at all
              WHEN "registrations"."id" = :givenUserId 
                AND (
                  ("volunteerRequest"."userId" = :givenUserId AND "volunteerRequest"."status" != :acceptedStatus) 
                  OR "volunteerRequest"."userId" != :givenUserId
                )
              THEN 'registered'
    
              -- Default: no status
              ELSE NULL
            END
          ) AS "volunteerStatus"
          `,
      )
      .setParameter("givenUserId", userId)
      .setParameter("acceptedStatus", VolunteerRequestStatus.ACCEPTED)
      .setParameter("todayDate", new Date())
      .addGroupBy("events.id");

    baseQuery.andWhere(
      `
        CASE
          -- Attended: if the user has an accepted volunteer request
          WHEN "volunteerRequest"."userId" = :givenUserId 
            AND "volunteerRequest".status = :acceptedStatus THEN 'attended'
    
          -- Registered: if the user is registered but has no accepted volunteer request or has no request at all
          WHEN "registrations"."id" = :givenUserId 
            AND (
              ("volunteerRequest"."userId" = :givenUserId AND "volunteerRequest"."status" != :acceptedStatus) 
              OR "volunteerRequest"."userId" != :givenUserId
            )
          THEN 'registered'
    
          -- Missed: if the user registered but was not accepted, and the event has ended or is closed
          WHEN "registrations"."id" = :givenUserId
            AND ("volunteerRequest"."id" IS NULL OR "volunteerRequest".status != :acceptedStatus)
            AND (events.endDate IS NOT NULL AND (events.endDate < :todayDate OR events.closed IS NOT NULL))
          THEN 'missed'
          
          ELSE NULL
        END IN ('attended', 'registered', 'missed')
        `,
    );
  }
}
