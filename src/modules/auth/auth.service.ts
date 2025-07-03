import * as bcrypt from "bcrypt";
import * as moment from "moment";
import { SocialType } from "src/modules/user/user.entity";

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";

import { Request } from "express";
import { getClientIp } from "request-ip";
import { IsNull, Not, QueryRunner, Repository } from "typeorm";
import { UAParser } from "ua-parser-js";
import { v4 as uuidv4 } from "uuid";

import { ConfigService } from "@nestjs/config";
import { includeAll } from "src/utils/include-all";
import { AdminService } from "../admin/admin.service";
import { MailsService } from "../mails/mails.service";
import { S3Service } from "../s3/s3.service";
import { RegistrationStatus, User, UserRoles } from "../user/user.entity";
import { UserKycDto } from "./dtos/create-user-kyc.dto";
import { CreateVolunteerAuthDto } from "./dtos/create-volunteer-auth.dto";
import { ForgotPasswordDto } from "./dtos/forget-password.dto";
import { ResetPasswordDto } from "./dtos/reset-password.dto";
import { SignInUserDto } from "./dtos/signin.dto";
import { ThirdPartyLoginDto } from "./dtos/third-party-login.dto";
import { VerifyOtpDto } from "./dtos/verify-otp.dto";
import { LoginAttempt, LoginType } from "./entities/login-attempt.entity";
import { Otp } from "./entities/otp.entity";
import { AppleAuthService } from "./services/apple.auth.service";
import { FacebookAuthService } from "./services/facebook.auth.service";
import { GoogleAuthService } from "./services/google.auth.service";
import { UserS3Paths } from "src/static/s3-paths";
import { WalletService } from "../wallet/wallet.service";
import { ActivationStatus } from "src/shared/enums";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/enums/notification-type.enum";
import { TransactionManagerService } from "src/shared/services/transaction-manager.service";
import { PaymentIntent, PaymentIntentStatus } from "src/shared/entities/payment-intent.entity";
import { VoltzType } from "../wallet-transaction/entities/wallet-transaction.entity";
import { Wallet } from "../wallet/entities/wallet.entity";
import { ValidationException } from "src/utils/formate-validation-exception";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,

    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,

    private readonly transactionManagerService: TransactionManagerService,
    private readonly jwtService: JwtService,
    private readonly mailsService: MailsService,
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly facebookAuthService: FacebookAuthService,
    private readonly appleAuthService: AppleAuthService,
    private readonly s3Service: S3Service,
    private readonly adminService: AdminService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
  ) {}

  // *-------------------> helpers  <-------------------
  private async generateTokenForUser(id: string): Promise<string> {
    return this.jwtService.signAsync({
      userId: id,
    });
  }

  private async comparePasswords(userPassword: string, receivedPassword: string): Promise<boolean> {
    return bcrypt.compare(receivedPassword, userPassword);
  }

  private async createLoginAttempt(
    req: Request,
    user: User,
    accessToken: string,
    queryRunner: QueryRunner,
    loginType?: string,
  ) {
    const parser = new UAParser();
    const userAgentInfo = parser.setUA(req.headers["user-agent"]).getResult();

    const loginAttempt = queryRunner.manager.create(LoginAttempt, {
      user: user,
      accessToken: accessToken,
      ipAddress: getClientIp(req),
      platform: userAgentInfo?.os?.name,
      userAgent: req?.headers["user-agent"],
      expireAt: moment().add(1, "M").toDate() as Date,
      loginType: loginType as LoginType,
    });

    return queryRunner.manager.save(LoginAttempt, loginAttempt);
  }

  private signInValidation(signInUserDto: SignInUserDto) {
    const { phoneNumber, email, loginType } = signInUserDto;

    if (loginType === LoginType.EMAIL && !email) {
      throw new BadRequestException("Please provide a valid email address");
    }

    if (loginType === LoginType.PHONE_NUMBER && !phoneNumber) {
      throw new BadRequestException("Please provide a valid phone number");
    }

    if (loginType === LoginType.PHONE_NUMBER && email) {
      throw new BadRequestException(
        'An email address should not be provided when the login type is set to "PHONE_NUMBER".',
      );
    }

    if (loginType === LoginType.EMAIL && phoneNumber) {
      throw new BadRequestException('A phone number should not be provided when the login type is set to "EMAIL".');
    }
  }

  private async creditWalletWithFoundationalVoltz(queryRunner: QueryRunner, user: User) {
    const paymentIntentsOfGuestUser = await queryRunner.manager.find(PaymentIntent, {
      where: {
        status: PaymentIntentStatus.COMPLETED,
        voltzType: VoltzType.FOUNDATIONAL,
        guestUser: {
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
      },
      relations: { guestUser: true },
    });

    const totalFoundationalVoltzCalculated = paymentIntentsOfGuestUser.reduce(
      (totalFoundationalVoltz, pi) => Number(totalFoundationalVoltz) + Number(pi.voltzRequested),
      0.0,
    );

    user.wallet.foundationalVoltz = Number(user.wallet.foundationalVoltz) + Number(totalFoundationalVoltzCalculated);

    await queryRunner.manager.save(Wallet, user.wallet);

    await queryRunner.manager.save(
      PaymentIntent,
      paymentIntentsOfGuestUser.map(pi => {
        pi.status = PaymentIntentStatus.CREDITED_TO_WALLET;
        pi.user = user;
        return pi;
      }),
    );
  }

  // *-------------------> helpers  <-------------------

  // *-------------------> services  <-------------------

  async volunteerSignUp(req: Request, createVolunteerAuthDto: CreateVolunteerAuthDto) {
    const normalizedEmail = createVolunteerAuthDto.email.toLowerCase();

    return this.transactionManagerService.executeInTransaction(async queryRunner => {
      let existingUser = await queryRunner.manager.findOne(User, {
        where: { email: normalizedEmail, phoneNumber: createVolunteerAuthDto.phoneNumber },
        select: ["id", "deletedAt"],
      });

      let newUser: User;

      if (existingUser) {
        throw new ValidationException({ email: "Email is in use", phoneNumber: "Phone Number is in use" });
      }

      const user = queryRunner.manager.create(User, {
        ...createVolunteerAuthDto,
        email: normalizedEmail,
      });

      newUser = await queryRunner.manager.save(User, user);

      newUser.wallet = await this.walletService.createWallet(newUser, queryRunner);

      if (newUser.role !== UserRoles.ADMIN) {
        await this.creditWalletWithFoundationalVoltz(queryRunner, newUser);
      }

      const { password, ...userData } = newUser;

      const accessToken = await this.generateTokenForUser(String(userData.id));

      await this.createLoginAttempt(req, newUser, accessToken, queryRunner, LoginType.EMAIL);

      delete userData.wallet.user;

      return {
        message: "Signed up successful",
        details: userData,
        extra: {
          accessToken,
        },
      };
    });
  }

  async signIn(req: Request, signInUserData: SignInUserDto) {
    const { email, password, role, loginType, phoneNumber } = signInUserData;

    this.signInValidation(signInUserData);

    return this.transactionManagerService.executeInTransaction(async queryRunner => {
      let userData = await queryRunner.manager.findOne(User, {
        where: {
          ...(loginType === LoginType.EMAIL && { email: email.toLowerCase() }), // Normalize email
          ...(loginType === LoginType.PHONE_NUMBER && { phoneNumber: phoneNumber }),
          deletedAt: IsNull(),
          role: (role as UserRoles) === UserRoles.VOLUNTEER ? UserRoles.VOLUNTEER : Not(UserRoles.VOLUNTEER),
        },
        relations: {
          topics: true,
          sdgs: true,
          lifeStages: true,
          interestedLocations: true,
          wallet: true,
          campaignManagerCreatedBy: { wallet: true },
        },
        select: includeAll(this.usersRepository),
      });

      if (!userData) {
        throw new NotFoundException("User not found");
      }

      if (userData.activationStatus === ActivationStatus.IN_ACTIVE) {
        throw new BadRequestException("Your account has been deactivated by the admin");
      }

      if (
        (userData.role === UserRoles.NGO || userData.role === UserRoles.COMPANY) &&
        userData.registrationStatus === RegistrationStatus.PENDING
      ) {
        throw new ForbiddenException("Your account is currently under review. Please wait for admin approval");
      }

      if (!userData.password) {
        throw new BadRequestException(
          "Please first create your password by clicking the create password button from the email",
        );
      }

      if (!(await this.comparePasswords(userData.password, password))) {
        throw new BadRequestException("Invalid Credentials");
      }

      if (![UserRoles.CAMPAIGN_MANAGER, UserRoles.ADMIN].includes(userData.role)) {
        await this.creditWalletWithFoundationalVoltz(queryRunner, userData);
      }

      const accessToken = await this.generateTokenForUser(String(userData.id));
      delete userData.password;
      delete userData?.wallet?.user;

      await this.createLoginAttempt(req, userData, accessToken, queryRunner, loginType);

      return {
        message: "Signed in successful",
        details: userData,
        extra: {
          accessToken: accessToken,
        },
      };
    });
  }

  async thirdPartyLogin(req: Request, thirdPartyLoginData: ThirdPartyLoginDto) {
    const { provider, token, accessToken: receivedAccessToken } = thirdPartyLoginData;
    console.log("🚀 ~ AuthService ~ thirdPartyLogin ~ provider:", provider,"\n\ntoken: [ ", token, " ] \n\nreceivedAccessToken: [ ", receivedAccessToken, " ]\n");
    if (!provider || !token) {
      throw new BadRequestException("Provider and token are required");
    }
    // Verify token based on provider
    let retrieveUserData: any;
    switch (provider) {
      case SocialType.GOOGlE:
        try {
          retrieveUserData = await this.googleAuthService.verifyToken(token, receivedAccessToken);
          if (!retrieveUserData.email) {
            throw new BadRequestException("Google token does not contain an email");
          } 
        } catch (error) {
          console.error("Error verifying Google token:", error);
          throw new BadRequestException("Invalid Google token");
        }
        break;
      case SocialType.FACEBOOK:
        try {
          console.log("Verifying Facebook token:", token);
          retrieveUserData = await this.facebookAuthService.verifyToken(token);
          if (!retrieveUserData.email) {
            throw new BadRequestException("Facebook token does not contain an email");
          }
        } catch (error) {
          console.error("Error verifying Facebook token:", error);
          throw new BadRequestException("Invalid Facebook token");
        }
        break;
      case SocialType.APPLE:
        retrieveUserData = await this.appleAuthService.verifyToken(token);
        break;
    }

    if (!retrieveUserData) {
      throw new BadRequestException("Invalid token or unable to retrieve user data");
    }

    return this.transactionManagerService.executeInTransaction(async queryRunner => {
      // Find the user by email
      let user = await queryRunner.manager.findOne(User, {
        where: {
          email: retrieveUserData.email.toLowerCase(), // Normalize email
        },
        relations: {
          topics: true,
          sdgs: true,
          lifeStages: true,
          interestedLocations: true,
          wallet: true,
        },
        withDeleted: true,
      });

      let isNewUser = false;

      // Handle new user creation
      if (!user) {
        const newUser = queryRunner.manager.create(User, {
          email: retrieveUserData.email.toLowerCase(), // Normalize email
          firstName: retrieveUserData.firstName || "",
          lastName: retrieveUserData.lastName || "",
          socialType: provider,
        });

        user = await queryRunner.manager.save(User, newUser);

        // Create wallet within the transaction
        await this.walletService.createWallet(user, queryRunner);

        isNewUser = true;
      } else if (user.deletedAt) {
        // Recover soft-deleted user
        user.deletedAt = null;
        await queryRunner.manager.save(User, user);
      }

      // Generate access token
      const accessToken = await this.generateTokenForUser(String(user.id));

      // Log the login attempt
      await this.createLoginAttempt(req, user, accessToken, queryRunner, provider);

      return { user: { ...user, isNewUser }, accessToken };
    });
  }

  async forgetPassword(forgetPasswordData: ForgotPasswordDto) {
    const normalizedEmail = forgetPasswordData.email.toLowerCase(); // Normalize email
    console.log("Reset password request for email:", normalizedEmail);
    let userData = await this.usersRepository.findOne({
      where: {
        email: normalizedEmail,
        deletedAt: null,
        activationStatus: ActivationStatus.ACTIVE,
      },
    });
    console.log("User data found:", userData);
    if (!userData) {
      throw new BadRequestException("User not found");
    }

    const now = new Date();
    console.log("Current time:", now);
    if (userData.blockExpiresAt && userData.blockExpiresAt > now) {
      throw new BadRequestException("Too many attempts. Please try again later.");
    }
    console.log("OTP resend attempts check:");
    // Reset otpResendAttempts and blockExpiresAt if block time has expired
    if (userData.blockExpiresAt && userData.blockExpiresAt <= now) {
      userData.otpResendAttempts = 0;
      userData.blockExpiresAt = null;
    }
    console.log("OTP resend attempts:", userData.otpResendAttempts);
    if (userData.otpResendAttempts >= 4) {
      userData.blockExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // Block for 1 hour
      await this.usersRepository.save(userData);
      throw new BadRequestException("Too many attempts. Please try again later.");
    }
    console.log("Generating new OTP for user:", userData.email);
    // Mark all previous OTPs as used
    await this.otpRepository.update({ user: userData, isUsed: false }, { isUsed: true });

    // Increase otpResendAttempts
    userData.otpResendAttempts += 1;
    await this.usersRepository.save(userData);
    console.log("OTP resend attempts after increment:", userData.otpResendAttempts);
//    const otp = uuidv4().slice(0, 6); // Generate a 6-character OTP  // for testing purposes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();  // 6-digit numeric OTP
    // const otp = "000000"; // Generate a 6-character OTP
    console.log("Generated OTP:", otp);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes
    console.log("OTP expires at:", expiresAt);
    const otpEntity = this.otpRepository.create({
      otp,
      user: userData,
      expiresAt,
    });
    console.log("Saving OTP entity:", otpEntity);
    await this.otpRepository.save(otpEntity);
    console.log("OTP saved successfully for user:", userData.email);
    // Send OTP to user via email/SMS (implementation not shown here)
    try {
      await this.mailsService.sendForgetPasswordEmail(userData, otpEntity.otp);
    } catch (error) {
      console.error("Error sending OTP email:", error);
      throw new BadRequestException("Failed to send OTP. Please try again later.");
    }
    console.log("OTP sent to user:", userData.email);
  }

  async verifyOtp(verifyOtpData: VerifyOtpDto) {
    const { email, otp } = verifyOtpData;
    console.log("Verifying OTP for email:", email, "OTP:", otp);
    try {
      if (!email || !otp) {
        throw new BadRequestException("Email and OTP are required.");
      }
    } catch (error) {
      console.error("Error in verifyOtp:", error);
      throw new BadRequestException("Email and OTP are required.");
    }
    const otpEntity = await this.otpRepository.findOne({
      where: { user: { email: email }, otp, isUsed: false },
    });
    console.log("OTP entity found:", otpEntity);
    if (!otpEntity || otpEntity.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired OTP.");
    }
    console.log("OTP verified successfully for email:", email);
    otpEntity.isUsed = true;
    await this.otpRepository.save(otpEntity);

    return {
      message: "OTP verified successfully.",
      details: { otpId: otpEntity.id? otpEntity.id : 1 },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { otpId, newPassword, userToken } = resetPasswordDto;
    console.log('otpID:', otpId, 'newPassword:', newPassword, 'userToken:', userToken);

    let otpEntity: Otp | undefined;
    let decodedToken: any | undefined;

    if (userToken) {
      try {
        decodedToken = await this.jwtService.verifyAsync(userToken, {
          secret: this.configService.get("jwt.secret"),
        });
      } catch (error) {
        const errorMessage =
          error.message === "invalid signature"
            ? "Invalid user token"
            : error.message === "jwt expired"
              ? "The link is expired, request a new link."
              : error.message;

        throw new BadRequestException(errorMessage);
      }
    } else {
      otpEntity = await this.otpRepository.findOne({
        where: { id: otpId, isUsed: true },
        relations: { user: true },
      });

      if (!otpEntity) {
        throw new BadRequestException("OTP not found.");
      }
    }

    const userId = decodedToken?.userId || otpEntity?.user.id;

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException("User not found.");
    }

    if (user.resetPasswordLinkUsed && !otpId) {
      throw new BadRequestException(
        "This link has already been used to set a password. Please use the provided credentials or request a new link.",
      );
    }

    user.password = newPassword;
    if (decodedToken) {
      user.resetPasswordLinkUsed = true;
    }

    await this.usersRepository.save(user);

    return { message: "Password reset successfully." };
  }

  async changePassword(user: User, resetPasswordDto: any) {
    const { password, newPassword } = resetPasswordDto;

    const userData = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ["password", "id", "role"],
    });

    if (!userData) {
      throw new BadRequestException("User not found.");
    }

    if (!(await this.comparePasswords(userData.password, password))) {
      throw new BadRequestException("The provided password is wrong");
    }

    userData.password = newPassword;
    await this.usersRepository.update(user.id, userData);
  }

  async userKyc(ngoKycData: UserKycDto, user?: User) {
    const email = ngoKycData.email;

    let userIsDeleted = await this.usersRepository.findOne({
      where: {
        email: email,
        deletedAt: Not(IsNull()),
        role: ngoKycData.role,
      },
      withDeleted: true,
      select: ["id", "password", "deletedAt"],
    });

    const profileImage = await this.s3Service.uploadFile(ngoKycData.profileImage, UserS3Paths.PROFILE_IMAGE);
    const bannerImage = await this.s3Service.uploadFile(ngoKycData.bannerImage, UserS3Paths.BANNER_IMAGE);
    const csrPolicyDoc = await this.s3Service.uploadFile(ngoKycData.csrPolicyDoc, UserS3Paths.CSR_POLICY_DOC);
    const certificateOfReg = await this.s3Service.uploadFile(
      ngoKycData.certificateOfReg,
      UserS3Paths.CERTIFICATE_OF_REGISTRATION,
    );

    const userData = {
      ...ngoKycData,
      email: email,
      profileImage: profileImage,
      bannerImage: bannerImage,
      csrPolicyDoc: csrPolicyDoc,
      certificateOfReg: certificateOfReg,
    };

    let createdUser: User;

    if (userIsDeleted) {
      userIsDeleted.deletedAt = null;
      createdUser = await this.usersRepository.save({ ...userIsDeleted, ...userData });
    } else {
      const newUser = this.usersRepository.create(userData);
      createdUser = await this.usersRepository.save(newUser);
      console.log("🚀 ~ AuthService ~ userKyc ~ createdUser:", createdUser);
    }

    if (user && user.role === UserRoles.ADMIN) {
      console.log("🚀 ~ AuthService ~ userKyc ~ user:", user);
      await this.adminService.approveUserKyc(createdUser.id, {
        registrationStatus: RegistrationStatus.APPROVED,
      });
    } else {
      const admins = await this.usersRepository.find({
        where: { role: UserRoles.ADMIN },
      });

      await this.notificationService.sendNotificationToMultipleUsers(
        admins.map(admin => admin.id),
        {
          title: `A new ${createdUser.role.toUpperCase()} is requesting for account approval`,
          message: `A new ${createdUser.role.toUpperCase()} having name ${createdUser.name} filled the kyc form`,
          profileImage: createdUser.profileImage,
          bannerImage: createdUser.bannerImage,
          data: {
            notificationType: NotificationType.NEW_KYC_SUBMITTED,
          },
        },
      );
    }
  }

  async logout(currentLoginAttempt: LoginAttempt) {
    currentLoginAttempt.expireAt = new Date();
    currentLoginAttempt.logoutAt = new Date();

    await this.loginAttemptRepository.save(currentLoginAttempt);
  }
}
