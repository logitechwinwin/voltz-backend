import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { FormDataRequest } from "nestjs-form-data";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { IResponse } from "src/shared/interfaces/response.interface";
import { User, UserRoles } from "../user/user.entity";
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dtos/change-passowrd.dto";
import { UserKycDto } from "./dtos/create-user-kyc.dto";
import { CreateVolunteerAuthDto } from "./dtos/create-volunteer-auth.dto";
import { ForgotPasswordDto } from "./dtos/forget-password.dto";
import { ResetPasswordDto } from "./dtos/reset-password.dto";
import { SignInUserDto } from "./dtos/signin.dto";
import { ThirdPartyLoginDto } from "./dtos/third-party-login.dto";
import { VerifyOtpDto } from "./dtos/verify-otp.dto";
import { CurrentLoginAttempt } from "src/decorators/current-login-attempt.decorator";
import { LoginAttempt } from "./entities/login-attempt.entity";
import { RolesDecorator } from "src/shared/guards/roles.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("volunteer/sign-up")
  async volunteerSignUp(@Req() req, @Body() createVolunteerAuthDto: CreateVolunteerAuthDto): Promise<IResponse> {
    return await this.authService.volunteerSignUp(req, createVolunteerAuthDto);
  }

  @Post("sign-in")
  signIn(@Req() req, @Body() signInUserData: SignInUserDto): Promise<IResponse> {
    return this.authService.signIn(req, signInUserData);
  }

  @Post("third-party-login")
  async thirdPartyLogin(@Req() req, @Body() thirdPartyLoginData: ThirdPartyLoginDto): Promise<IResponse> {
    const { user, accessToken } = await this.authService.thirdPartyLogin(req, thirdPartyLoginData);

    return {
      message: `User login successfully by ${thirdPartyLoginData.provider}`,
      details: {
        ...user,
      },
      extra: { accessToken },
    };
  }

  @Get("me")
  @UseGuards(AuthenticationGuard)
  async me(@CurrentUser() user: User): Promise<IResponse> {
    return {
      message: "User authenticated successfully",
      details: user,
    };
  }

  @Post("forget-password")
  async forgetPassword(@Body() forgetPasswordData: ForgotPasswordDto): Promise<IResponse> {
    await this.authService.forgetPassword(forgetPasswordData);
    return {
      message: "OTP sent successfully.",
    };
  }

  @Post("verify-otp")
  async verifyOtp(@Body() verifyOtpData: VerifyOtpDto): Promise<IResponse> {
    return this.authService.verifyOtp(verifyOtpData);
  }

  @Post("reset-password")
  async resetPassword(@Body() resetPasswordData: ResetPasswordDto): Promise<IResponse> {
    return this.authService.resetPassword(resetPasswordData);
  }

  @Post("resend-otp")
  async resendOtp(@Body() resSendOtpData: ForgotPasswordDto): Promise<IResponse> {
    this.authService.forgetPassword(resSendOtpData);
    return {
      message: "OTP sent successfully.",
    };
  }

  @Patch("change-password")
  @UseGuards(AuthenticationGuard, RolesGuard)
  async changePassword(@CurrentUser() user: User, @Body() changePasswordData: ChangePasswordDto): Promise<IResponse> {
    await this.authService.changePassword(user, changePasswordData);
    return {
      message: "Password change successfully",
    };
  }

  @Post("kyc")
  @UseGuards(OptionalAuthGuard)
  @FormDataRequest()
  async userKyc(@CurrentUser() user: User, @Body() useKycData: UserKycDto): Promise<IResponse> {
    await this.authService.userKyc(useKycData, user);
    return {
      message: "Your KYC submission is under review. You will receive an email once the review is complete.",
    };
  }

  @Post("logout")
  @UseGuards(AuthenticationGuard)
  async logout(@CurrentLoginAttempt() currentLoginAttempt: LoginAttempt): Promise<IResponse> {
    await this.authService.logout(currentLoginAttempt);

    return {
      message: "Logged out successfully",
    };
  }
}
