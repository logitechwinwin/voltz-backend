import { Processor, Process, OnQueueFailed } from "@nestjs/bull";
import { Job } from "bull";
import { MailsService } from "./mails.service";
import { ConfigService } from "@nestjs/config";

@Processor(`${process.env.NODE_ENV}-emailSending`) // This should match the queue name
export class EmailSendingProcessor {
  constructor(
    private readonly mailsService: MailsService,
    private readonly configService: ConfigService,
  ) {}

  @Process("send-email")
  async handleSendEmail(job: Job<any>) {
    const { template, subject, context, to } = job.data;

    try {
      await this.mailsService.sendEmail(template, subject, context, to);
      console.log("sending email", this.configService.get("nodeEnv"));
      job.moveToCompleted(); // Mark the job as completed
    } catch (error) {
      console.log("🚀 ~ EmailSendingProcessor ~ handleSendEmail ~ error:", error);

      // Specific error handling for different cases
      if (error.code === "ESOCKET" || error.code === "ECONNREFUSED") {
        console.error("Connection to email server refused. Check your SMTP configuration.");
      } else if (error.code === "EAUTH") {
        console.error("Email authentication failed. Check your credentials.");
      } else if (error.code === "ETIMEDOUT") {
        console.error("Email sending timed out.");
      }

      // Retry logic
      const attempts = job.attemptsMade;
      if (attempts < 3) {
        console.log(`Retrying... (${attempts + 1}/3)`);
        await job.retry(); // Retry the job up to 3 times
      } else {
        // After 3 failed attempts, move job to failed state
        await job.moveToFailed({ message: error.message });
      }
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: any) {
    console.error(`Job failed with reason: ${error.message}`);
    // Additional actions like sending alerts or logging
  }
}
