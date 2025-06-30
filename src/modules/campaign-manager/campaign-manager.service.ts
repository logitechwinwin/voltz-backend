import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCampaignManagerDto } from "./dto/create-campaign-manager.dto";
import { UpdateCampaignManagerDto } from "./dto/update-campaign-manager.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Any, Not, Repository } from "typeorm";
import { RegistrationStatus, User, UserRoles } from "../user/user.entity";
import { JwtService } from "@nestjs/jwt";
import { MailsService } from "../mails/mails.service";
import { ConfigService } from "@nestjs/config";
import { S3Service } from "../s3/s3.service";
import { ValidationException } from "src/utils/formate-validation-exception";
import { GetAllCampaignManagersDto } from "./dto/get-all-campaign-managers.dto";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { UserS3Paths } from "src/static/s3-paths";

@Injectable()
export class CampaignManagerService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailsService: MailsService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  async create(createCampaignManagerDto: CreateCampaignManagerDto, currentUser: User) {
    const { email, firstName, lastName, phoneNumber, profileImage, bannerImage } = createCampaignManagerDto;

    await this.validateEmailAndPhoneUniqueness({ email: email, phoneNumber: phoneNumber });

    const profileImagePath = await this.s3Service.uploadFile(profileImage, UserS3Paths.PROFILE_IMAGE);
    const bannerImagePath = await this.s3Service.uploadFile(bannerImage, UserS3Paths.PROFILE_IMAGE);

    const campaignManager = this.userRepository.create({
      email,
      firstName,
      lastName,
      phoneNumber,
      role: UserRoles.CAMPAIGN_MANAGER,
      registrationStatus: RegistrationStatus.APPROVED,
      campaignManagerCreatedBy: currentUser,
      profileImage: profileImagePath,
      bannerImage: bannerImagePath,
    });

    const campaignManagerCreated = await this.userRepository.save(campaignManager);

    const encodedCampaignManagerId = await this.jwtService.signAsync({
      userId: campaignManager.id,
    });

    // ** campaign manager uses this url to create his password
    const redirectUrl = `${this.configService.get("urls.frontendPanelBaseUrl")}${this.configService.get("urls.createPasswordPath")}?userToken=${encodedCampaignManagerId}`;

    await this.mailsService.sendEmailToCampaignManagerToCreatePassword(campaignManager, redirectUrl);

    return campaignManagerCreated;
  }

  async findAll(getAllCampaignManagersDto: GetAllCampaignManagersDto, currentUser: User) {
    const { page, perPage, ngoId, search } = getAllCampaignManagersDto;

    if (currentUser.role === UserRoles.NGO && ngoId !== currentUser.id) {
      throw new BadRequestException("You can't access other ngos campaign managers");
    }

    const campaignManagerQuery = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.campaignManagerCreatedBy", "createdBy")
      .where("createdBy.id = :ngoId", { ngoId: ngoId })
      .andWhere("user.role = :campaignManagerRole", { campaignManagerRole: UserRoles.CAMPAIGN_MANAGER })
      .orderBy("user.createdAt", "DESC");

    if (search) {
      campaignManagerQuery.andWhere(
        `(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)`,
        {
          search: `%${search}%`,
        },
      );
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate(campaignManagerQuery, paginationOptions);
  }

  async findOne(id: number, currentUser: User) {
    const campaignManagerQuery = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.campaignManagerCreatedBy", "createdBy")
      .leftJoinAndSelect("user.assignedEvents", "assignedEvents")
      .where("user.id = :id", { id: id })
      .andWhere("createdBy.id = :currentUserId", { currentUserId: currentUser.id });

    const campaignManager = await campaignManagerQuery.getOne();

    if (!campaignManager) {
      throw new NotFoundException("Campaign manager either doesn't exists or doesn't belong too you");
    }

    return campaignManager;
  }

  async update(id: number, updateCampaignManagerDto: UpdateCampaignManagerDto, currentUser: User) {
    const campaignManager = await this.userRepository.findOne({
      where: { id: id },
      relations: { campaignManagerCreatedBy: true },
    });

    if (!campaignManager) {
      throw new NotFoundException("Campaign Manager not found.");
    }

    this.validateUserAccess(campaignManager, currentUser);

    await this.validateEmailAndPhoneUniqueness({
      email: updateCampaignManagerDto.email,
      phoneNumber: updateCampaignManagerDto.phoneNumber,
      userId: campaignManager.id,
    });

    if (updateCampaignManagerDto.profileImage) {
      console.log("🚀 ~ CampaignManagerService ~ update ~ campaignManager.profileImage:", campaignManager.profileImage);
      await this.s3Service.deleteFile(campaignManager.profileImage);
      campaignManager.profileImage = await this.s3Service.uploadFile(
        updateCampaignManagerDto.profileImage,
        UserS3Paths.PROFILE_IMAGE,
      );
    }

    if (updateCampaignManagerDto.bannerImage) {
      await this.s3Service.deleteFile(campaignManager.bannerImage);
      campaignManager.bannerImage = await this.s3Service.uploadFile(
        updateCampaignManagerDto.bannerImage,
        UserS3Paths.BANNER_IMAGE,
      );
    }

    const { profileImage, bannerImage, ...updateFields } = updateCampaignManagerDto;

    Object.assign(campaignManager, updateFields);

    return this.userRepository.save(campaignManager);
  }

  async remove(id: number, currentUser: User) {
    const campaignManager = await this.userRepository.findOne({
      where: { id: id, campaignManagerCreatedBy: { id: currentUser.id } },
      relations: { assignedEvents: true },
    });

    if (!campaignManager) {
      throw new BadRequestException("Campaign manager not found");
    }

    if (campaignManager.assignedEvents.length > 0) {
      throw new BadRequestException(
        `Remove campaign manager from the campaigns ${campaignManager.assignedEvents.map(event => `${event.title} `)}`,
      );
    }

    return this.userRepository.remove(campaignManager);
  }

  private validateUserAccess(campaignManager: User, currentUser: User) {
    if (currentUser.role === UserRoles.NGO && campaignManager.campaignManagerCreatedBy.id !== currentUser.id) {
      throw new BadRequestException("Campaign Manager doesn't belong to you.");
    } else if (currentUser.role === UserRoles.CAMPAIGN_MANAGER && campaignManager.id !== currentUser.id) {
      throw new BadRequestException("You can only update your own profile.");
    }
  }

  private async validateEmailAndPhoneUniqueness({
    email,
    phoneNumber,
    userId,
  }: {
    email: string;
    phoneNumber: string;
    userId?: number;
  }) {
    const existingUserQuery = this.userRepository
      .createQueryBuilder("user")
      .where("(user.email = :email OR user.phoneNumber = :phoneNumber)", { email, phoneNumber });

    if (userId) {
      existingUserQuery.andWhere("user.id != :userId", { userId });
    }

    const existingUser = await existingUserQuery.getOne();

    if (existingUser) {
      const errors: { [key: string]: string } = {}; // This defines errors as an object with string keys and string values
      if (existingUser.email === email) {
        errors.email = "Email already exists";
      }
      if (existingUser.phoneNumber === phoneNumber) {
        errors.phoneNumber = "Phone Number already exists";
      }

      throw new ValidationException(errors);
    }
  }
}
