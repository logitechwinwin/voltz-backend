import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import * as moment from "moment";
import { User } from "src/modules/user/user.entity";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MailsService {
  private backendUrl: string;
  private companyName: string;

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
    @InjectQueue(`${process.env.NODE_ENV}-emailSending`) private readonly emailSendingQueue: Queue, // Inject Bull Queue
  ) {
    this.backendUrl = this.configService.get("domains.backend");
    this.companyName = this.configService.get("appName");
  }

  async sendEmailToCampaignManagerToCreatePassword(campaignManager: User, redirectUrl: string) {
    const context = {
      redirectUrl: redirectUrl,
      name: campaignManager.firstName,
      backendUrl: this.backendUrl,
      year: moment().get("year"),
      companyName: this.companyName,
    };

    await this.emailSendingQueue.add(
      "send-email",
      {
        template: "./campaign-manager-created",
        subject: "Congratulations on becoming the campaign manager",
        context,
        to: campaignManager.email,
      },
      {
        attempts: 3, // Retry the job up to 3 times
        backoff: 10000, // Wait 10 seconds between attempts
      },
    );
  }

  async sendForgetPasswordEmail(user: User, otp: string) {
    const context = {
      otp: otp,
      name: user.firstName || user.name || '',
      backendUrl: this.backendUrl,
      year: moment().get("year"),
      companyName: this.companyName,
    };
    console.log("Sending forget password email to:", context);
    
    // await this.emailSendingQueue.add(
    //   "send-email",
    //   {
    //     template: "./forget-password",
    //     subject: "Password Reset OTP Code",
    //     context,
    //     to: String(user.email),
    //   },
    //   {
    //     attempts: 3, // Retry the job up to 3 times
    //     backoff: 10000, // Wait 10 seconds between attempts
    //   },
    // );
    try {
      await this.mailerService.sendMail({
        to: String(user.email),
        subject: "[TEST] Password Reset OTP Code",
        template: "./forget-password",
        context,
      });
      console.log("Direct email sent successfully to:", user.email);
    } catch (err) {
      console.error("Direct email send failed:", err);
    }
    // Now add to Bull queue as before
    try {
      await this.emailSendingQueue.add(
        "send-email",
        {
          template: "./forget-password",
          subject: "Password Reset OTP Code",
          context,
          to: String(user.email),
        },
        {
          attempts: 3, // Retry the job up to 3 times
          backoff: 10000, // Wait 10 seconds between attempts
        },
      );
      console.log("Bull job added for email to:", user.email);
    } catch (err) {
      console.error("Bull job add failed:", err);
    }
  }

  async sendUserKycApprovedEmail(user: User, redirectUrl: string) {
    const context = {
      redirectUrl: redirectUrl,
      name: user.name,
      backendUrl: this.backendUrl,
      year: moment().get("year"),
      companyName: this.companyName,
    };

    // await this.emailSendingQueue.add(
    //   "send-email",
    //   {
    //     template: "./user-kyc-approved.hbs",
    //     subject: "Your account is approved",
    //     context,
    //     to: user.email,
    //   },
    //   {
    //     attempts: 3, // Retry the job up to 3 times
    //     backoff: 10000, // Wait 10 seconds between attempts
    //   },
    // );
    // Direct email send test (bypass Bull)
    try {
      await this.mailerService.sendMail({
        to: String(user.email),
        subject: "[TEST] Password Reset OTP Code",
        template: "./forget-password",
        context,
      });
      console.log("Direct email sent successfully to:", user.email);
    } catch (err) {
      console.error("Direct email send failed:", err);
    }
    // Now add to Bull queue as before
    try {
      await this.emailSendingQueue.add(
        "send-email",
        {
          template: "./forget-password",
          subject: "Password Reset OTP Code",
          context,
          to: String(user.email),
        },
        {
          attempts: 3, // Retry the job up to 3 times
          backoff: 10000, // Wait 10 seconds between attempts
        },
      );
      console.log("Bull job added for email to:", user.email);
    } catch (err) {
      console.error("Bull job add failed:", err);
    }

  }

  async sendUserKycRejectedEmail(user: User) {
    const context = {
      name: user.name,
      backendUrl: this.backendUrl,
      year: moment().get("year"),
      companyName: this.companyName,
    };

    await this.emailSendingQueue.add(
      "send-email",
      {
        template: "./user-kyc-rejected.hbs",
        subject: "Your account is rejected",
        context,
        to: user.email,
      },
      {
        attempts: 3, // Retry the job up to 3 times
        backoff: 10000, // Wait 10 seconds between attempts
      },
    );
  }

  // General method to send the email (called from Bull processor)
  async sendEmail(template: string, subject: string, context: any, to: string) {
    await this.mailerService.sendMail({
      to,
      subject,
      template,
      context,
    });
  }
}
