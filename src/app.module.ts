import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { config } from "config/config";
import { UsersModule } from "./modules/user/user.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SharedModule } from "./shared/shared.module";
import { MailsModule } from "./modules/mails/mails.module";
import { TopicModule } from "./modules/topic/topic.module";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AllExceptionsFilter } from "./shared/allExceptionFilter/all-exceptions.filter";
import { MemoryStoredFile, NestjsFormDataModule } from "nestjs-form-data";
import { AdminModule } from "./modules/admin/admin.module";
import { LifeStageModule } from "./modules/life-stage/life-stage.module";
import { NgoModule } from "./modules/ngo/ngo.module";
import { CompanyModule } from "./modules/company/company.module";
import { EventModule } from "./modules/event/event.module";
import { SdgModule } from "./modules/sdg/sdg.module";
import { DealModule } from "./modules/deal/deal.module";
import { ProductModule } from "./modules/product/product.module";
import { FollowModule } from "./modules/follow/follow.module";
import { DonationModule } from "./modules/donation/donation.module";
import { CommunityModule } from "./modules/community/community.module";
import { PostModule } from "./modules/post/post.module";
import { S3Module } from "./modules/s3/s3.module";
import { CategoryModule } from "./modules/category/category.module";
import { VolunteerRequestModule } from "./modules/volunteer-request/volunteer-request.module";
import { DealRequestModule } from "./modules/deal-request/deal-request.module";
import { ChatModule } from "./modules/chat/chat.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { GoalModule } from "./modules/goal/goal.module";
import { StoryModule } from "./modules/story/story.module";
import { ScheduleModule } from "@nestjs/schedule";
import { CampaignManagerModule } from "./modules/campaign-manager/campaign-manager.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { WalletTransactionModule } from "./modules/wallet-transaction/wallet-transaction.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { ActivationChangeLogModule } from "./modules/activation-change-log/activation-change-log.module";
import { VolunteerModule } from "./modules/volunteer/volunteer.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { LoggerService } from "./modules/logger/logger.service";
import { AllResponseInterceptor } from "./shared/interceptors/all-response.interceptor";
import { FoundationalVoltzModule } from './modules/foundational-voltz/foundational-voltz.module';
import { GuestUserModule } from './modules/guest-user/guest-user.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      // envFilePath: `.env.${process.env.NODE_ENV}`,  // for production
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],   // for development
      load: [config],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: "postgres",
          host: configService.get("database.host"),
          port: configService.get("database.port"),
          username: configService.get("database.username"),
          password: configService.get("database.password"),
          database: configService.get("database.dbName"),
          autoLoadEntities: true,
          synchronize: Boolean(configService.get("database.synchronize")),
        };
      },
    }),
    NestjsFormDataModule.config({
      isGlobal: true,
      storage: MemoryStoredFile,
    }),
    UsersModule,
    MailsModule,
    AuthModule,
    SharedModule,
    TopicModule,
    AdminModule,
    LifeStageModule,
    NgoModule,
    CompanyModule,
    EventModule,
    SdgModule,
    DealModule,
    ProductModule,
    FollowModule,
    DonationModule,
    PostModule,
    S3Module,
    CategoryModule,
    VolunteerRequestModule,
    DealRequestModule,
    ChatModule,
    EventEmitterModule.forRoot(),
    GoalModule,
    StoryModule,
    CampaignManagerModule,
    CommentsModule,
    WalletTransactionModule,
    WalletModule,
    ActivationChangeLogModule,
    CommunityModule,
    VolunteerModule,
    LoggerModule,
    FoundationalVoltzModule,
    GuestUserModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AllResponseInterceptor, // Make sure to register the interceptor this way
    },
  ],
})
export class AppModule {}
