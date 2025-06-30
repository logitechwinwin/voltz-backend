import { Module } from "@nestjs/common";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { MailsService } from "./mails.service";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { EmailSendingProcessor } from "./email-sending.processor";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        console.log("Configuring MailerModule with environment variables");
        if (!configService.get("EMAIL_HOST")) {
          throw new Error("Email host is not configured");
        }
        return {
          transport: {
            host: configService.get("EMAIL_HOST"),
            secure: false,
            auth: {
              user: configService.get("EMAIL_USERNAME"),
              pass: configService.get("EMAIL_PASSWORD"),
            },
          },
          defaults: {
            from: '"No Reply" <no-reply@email.voltz.global>',
          },
          template: {
            dir: join(__dirname, "templates"),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get("redis.host"),
          port: configService.get("redis.port"),
        },
      }),
    }),
    BullModule.registerQueue({
      name: `${process.env.NODE_ENV}-emailSending`, // Queue name
    }),
    BullBoardModule.forRoot({
      route: "/queues",
      adapter: ExpressAdapter, // Or FastifyAdapter from `@bull-board/fastify`
    }),
    BullBoardModule.forFeature({
      name: `${process.env.NODE_ENV}-emailSending`,
      adapter: BullAdapter, //or use BullAdapter if you're using bull instead of bullMQ
    }),
  ],
  providers: [MailsService, EmailSendingProcessor],
  exports: [MailsService],
})
export class MailsModule {}
