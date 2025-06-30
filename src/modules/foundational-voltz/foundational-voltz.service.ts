import { Injectable, NotFoundException } from "@nestjs/common";
import { User, UserRoles } from "../user/user.entity";
import { TransactionManagerService } from "src/shared/services/transaction-manager.service";
import { CreateUserBuysPaymentIntentDto } from "./dto/create-user-buys-payment-intent.dto";
import { PaymentIntent, PaymentIntentStatus } from "../../shared/entities/payment-intent.entity";
import { PaymentService } from "src/shared/services/payment.service";
import { VoltzType } from "../wallet-transaction/entities/wallet-transaction.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { Wallet } from "../wallet/entities/wallet.entity";
import { CreateGuestBuysPaymentIntentDto } from "./dto/create-guest-buys-payment-intent.dto";
import { GuestUser } from "../guest-user/entities/guest-user.entity";
import { verifyPaymentDto } from "../ngo/dto/verify-payment.dto";
import { GetAllVoltzPurchasingDto } from "./dto/get-all-voltz-purchasing.dto";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";

@Injectable()
export class FoundationalVoltzService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(PaymentIntent)
    private readonly paymentIntentRepository: Repository<PaymentIntent>,

    private readonly transactionManagerService: TransactionManagerService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  async createUserBuysPaymentIntent(
    req: Request,
    user: User,
    createUserBuysPaymentIntentDto: CreateUserBuysPaymentIntentDto,
  ) {
    const { voltzRequested, redirectUrl } = createUserBuysPaymentIntentDto;

    return await this.transactionManagerService.executeInTransaction(async queryRunner => {
      const paymentIntent = queryRunner.manager.create(PaymentIntent, {
        user: user,
        voltzRequested: voltzRequested,
        amount: 30 * voltzRequested,
        currency: "USD",
        status: PaymentIntentStatus.PENDING,
        voltzType: VoltzType.FOUNDATIONAL,
      });

      const formUrl = await this.paymentService.createPayment({
        productInfo: { unitCost: paymentIntent.amount },
        billingInfo: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
        userId: user.id,
        redirectUrl: redirectUrl,
        req: req,
      });

      paymentIntent.onlineToken = formUrl.split("/")[6];
      await queryRunner.manager.save(PaymentIntent, paymentIntent);

      return formUrl;
    });
  }

  async verifyPayment(user: User, tokenId: string) {
    return await this.transactionManagerService.executeInTransaction(async queryRunner => {
      const paymentIntent = await queryRunner.manager.findOne(PaymentIntent, {
        where: {
          user: { id: user.id },
          onlineToken: tokenId,
          status: PaymentIntentStatus.PENDING,
          voltzType: VoltzType.FOUNDATIONAL, // this route is only for foundational voltz verification
        },
        relations: { user: { wallet: true } },
      });

      if (!paymentIntent) {
        throw new NotFoundException("Payment intent not found or already processed");
      }

      await this.paymentService.verifyPayment(tokenId);

      paymentIntent.user.wallet.foundationalVoltz =
        Number(paymentIntent.user.wallet.foundationalVoltz) + Number(paymentIntent.voltzRequested);

      await queryRunner.manager.save(Wallet, paymentIntent.user.wallet);

      paymentIntent.status = PaymentIntentStatus.COMPLETED;

      await queryRunner.manager.save(PaymentIntent, paymentIntent);

      const admins = await this.usersRepository.find({
        where: { role: UserRoles.ADMIN },
      });

      await this.notificationService.sendNotificationToMultipleUsers(
        admins.map(admin => admin.id),
        {
          title: "Foundational Voltz Purchased",
          message: `Voltz purchase has been made by ${paymentIntent.user.firstName} ${paymentIntent.user.lastName} ${paymentIntent.user.role}`,
          profileImage: paymentIntent.user.profileImage,
          bannerImage: paymentIntent.user.bannerImage,
          data: {
            notificationType: NotificationType.FOUNDATIONAL_VOLTZ_PURCHASED,
          },
        },
      );
    });
  }

  async createGuestBuysPaymentIntent(createGuestBuysPaymentIntentDto: CreateGuestBuysPaymentIntentDto, req: Request) {
    const { email, firstName, lastName, phoneNumber, redirectUrl, voltzRequested } = createGuestBuysPaymentIntentDto;
    return await this.transactionManagerService.executeInTransaction(async queryRunner => {
      let guestUser = await queryRunner.manager.findOne(GuestUser, {
        where: { email: email, phoneNumber: phoneNumber },
      });

      if (!guestUser) {
        guestUser = queryRunner.manager.create(GuestUser, {
          email: email,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
        });

        await queryRunner.manager.save(GuestUser, guestUser);
      }

      const paymentIntent = queryRunner.manager.create(PaymentIntent, {
        guestUser: guestUser,
        voltzRequested: voltzRequested,
        amount: 30 * voltzRequested,
        currency: "USD",
        status: PaymentIntentStatus.PENDING,
        voltzType: VoltzType.FOUNDATIONAL,
      });

      const formUrl = await this.paymentService.createPayment({
        productInfo: { unitCost: paymentIntent.amount },
        billingInfo: {
          firstName: guestUser.firstName,
          lastName: guestUser.lastName,
          email: guestUser.email,
          phoneNumber: guestUser.phoneNumber,
        },
        userId: guestUser.id,
        redirectUrl: redirectUrl,
        req: req,
      });

      paymentIntent.onlineToken = formUrl.split("/")[6];
      await queryRunner.manager.save(PaymentIntent, paymentIntent);

      return formUrl;
    });
  }

  async verifyGuestPayment(verifyPaymentDto: verifyPaymentDto) {
    const { tokenId } = verifyPaymentDto;
    return await this.transactionManagerService.executeInTransaction(async queryRunner => {
      const paymentIntent = await queryRunner.manager.findOne(PaymentIntent, {
        where: {
          onlineToken: tokenId,
          status: PaymentIntentStatus.PENDING,
          voltzType: VoltzType.FOUNDATIONAL, // this route is only for foundational voltz verification
        },
        relations: { user: { wallet: true } },
      });

      if (!paymentIntent) {
        throw new NotFoundException("Payment intent not found or already processed");
      }

      await this.paymentService.verifyPayment(tokenId);

      paymentIntent.status = PaymentIntentStatus.COMPLETED;

      await queryRunner.manager.save(PaymentIntent, paymentIntent);

      const admins = await this.usersRepository.find({
        where: { role: UserRoles.ADMIN },
      });

      await this.notificationService.sendNotificationToMultipleUsers(
        admins.map(admin => admin.id),
        {
          title: "Foundational Voltz Purchased",
          message: `Voltz purchase has been made by a guest user`,
          data: {
            notificationType: NotificationType.FOUNDATIONAL_VOLTZ_PURCHASED,
          },
        },
      );
    });
  }

  async findAll(getAllVoltzPurchasingDto: GetAllVoltzPurchasingDto) {
    const { statuses, voltzType, lastPurchasingId, page, perPage } = getAllVoltzPurchasingDto;

    const queryBuilder = this.paymentIntentRepository
      .createQueryBuilder("paymentIntent")
      .leftJoinAndSelect("paymentIntent.user", "user")
      .leftJoinAndSelect("paymentIntent.guestUser", "guestUser")
      .orderBy("paymentIntent.id", "DESC");

    if (voltzType) {
      queryBuilder.andWhere(`paymentIntent.voltzType = :voltzType`, { voltzType: voltzType });
    }

    if (statuses) {
      queryBuilder.andWhere("paymentIntent.status IN (:...statuses)", { statuses: statuses });
    }

    if (lastPurchasingId) {
      queryBuilder.andWhere("paymentIntent.id < :lastPurchasingId", { lastPurchasingId });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate(queryBuilder, paginationOptions);
  }

  async calculateTotalFoundationalVoltzSellout() {
    const totalFoundationalVoltzSellout = await this.paymentIntentRepository
      .createQueryBuilder("paymentIntent")
      .select(`SUM(paymentIntent.voltzRequested)`, "totalVoltzSellout")
      .where(`"paymentIntent"."voltzType" = :foundationalType`, { foundationalType: VoltzType.FOUNDATIONAL })
      .andWhere(`"paymentIntent"."status" IN (:...statuses)`, {
        statuses: [PaymentIntentStatus.COMPLETED, PaymentIntentStatus.CREDITED_TO_WALLET],
      })
      .getRawOne();

    return totalFoundationalVoltzSellout.totalVoltzSellout;
  }

  findOne(id: number) {
    return `This action returns a #${id} foundationalVoltz`;
  }

  remove(id: number) {
    return `This action removes a #${id} foundationalVoltz`;
  }
}
