import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateDonationDto } from "./dto/create-donation.dto";
import { User } from "../user/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Donation, DonationStatuses } from "./entities/donation.entity";
import { Repository } from "typeorm";
import { Event } from "../event/entities/event.entity";
import { Request } from "express";
import { GetAllDonationDto } from "./dto/get-all-donation.dto";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { PaymentService } from "src/shared/services/payment.service";
import { ActivationStatus } from "src/shared/enums";
import { ValidationException } from "src/utils/formate-validation-exception";

@Injectable()
export class DonationService {
  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,

    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly paymentService: PaymentService,
  ) {}

  async create(user: User, createDonationDto: CreateDonationDto, req: Request) {
    const event = await this.eventRepository.findOne({
      where: {
        id: createDonationDto.eventId,
        activationStatus: ActivationStatus.ACTIVE,
        closed: null,
      },
    });

    if (!event) {
      throw new BadRequestException("Event not available for donation");
    }

    if (event.endDate && event.endDate < new Date()) {
      throw new BadRequestException("Event is expired");
    }

    if (event.donationRequired) {
      const remainingDonation = event.donationRequired - event.donationReceived;
      if (createDonationDto.amount > remainingDonation) {
        throw new ValidationException({ amount: `Remaining donation needed: $${remainingDonation}` });
      }
    }

    const donation = this.donationRepository.create({
      user: user,
      event: event,
      amount: createDonationDto.amount,
      currency: "USD",
      status: DonationStatuses.PENDING,
    });

    const formUrl = await this.paymentService.createPayment({
      productInfo: { unitCost: donation.amount },
      billingInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
      userId: user.id,
      redirectUrl: createDonationDto.redirectUrl,
      req: req,
    });

    donation.onlineToken = formUrl.split("/")[6];
    await this.donationRepository.save(donation);

    return formUrl;
  }

  async verify(user: User, tokenId: string, userId: number) {
    const donation = await this.donationRepository.findOne({
      relations: { event: true },
      where: { user: { id: userId }, onlineToken: tokenId, status: DonationStatuses.PENDING },
    });

    if (!donation) {
      throw new NotFoundException("Donation not found or already processed");
    }
    try {
      await this.paymentService.verifyPayment(tokenId);

      donation.status = DonationStatuses.COMPLETED;
      await this.donationRepository.save(donation);

      const event = await this.eventRepository.findOne({ where: { id: donation.event.id } });
      event.donationReceived = +event.donationReceived + +donation.amount;
      await event.save();
    } catch (err) {
      donation.status = DonationStatuses.FAILED;
      await this.donationRepository.save(donation);
      throw new BadRequestException(err.message);
    }
  }

  async findAll(queryData: GetAllDonationDto) {
    const { page, perPage, eventId, search } = queryData;
    const queryBuilder = this.donationRepository
      .createQueryBuilder("donation")
      .where("donation.status = :donationStatus", { donationStatus: DonationStatuses.COMPLETED })
      .leftJoinAndSelect("donation.user", "user")
      .leftJoinAndSelect("donation.event", "event");

    if (eventId) {
      queryBuilder.andWhere("event.id = :eventId", { eventId });
    }

    if (search) {
      queryBuilder.andWhere("user.firstName ILIKE :search OR user.lastName ILIKE :search", { search: `%${search}%` });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const paginatedDonations = await paginate<Donation>(queryBuilder, paginationOptions);

    return paginatedDonations;
  }

  findOne(id: number) {
    return `This action returns a #${id} donation`;
  }

  remove(id: number) {
    return `This action removes a #${id} donation`;
  }
}
