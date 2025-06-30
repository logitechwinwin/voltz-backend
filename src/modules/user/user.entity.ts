import * as bcrypt from "bcrypt";

import {
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { LoginAttempt } from "../auth/entities/login-attempt.entity";
import { Otp } from "../auth/entities/otp.entity";
import { ChatParticipant } from "../chat/entities/chat-participant.entity";
import { Community } from "../community/entities/community.entity";
import { Deal } from "../deal/entities/deal.entity";
import { Wishlist } from "../deal/entities/wishlist.entity";
import { Donation } from "../donation/entities/donation.entity";
import { Event } from "../event/entities/event.entity";
import { Follow } from "../follow/entities/follow.entity";
import { Goal } from "../goal/entities/goal.entity";
import { LifeStage } from "../life-stage/entities/life-stage.entity";
import { Notification } from "../notification/entities/notification.entity";
import { Post } from "../post/entities/post.entity";
import { Product } from "../product/entities/product.entity";
import { Sdg } from "../sdg/entities/sdg.entity";
import { Story } from "../story/entities/story.entity";
import { Topic } from "../topic/entities/topic.entity";
import { VolunteerRequest } from "../volunteer-request/entities/volunteer-request.entity";
import { InterestedLocation } from "./interested-location.entity";
import { Wallet } from "../wallet/entities/wallet.entity";
import { ActivationChangeLog } from "../activation-change-log/entities/activation-change-log.entity";
import { ActivationStatus } from "src/shared/enums";
import { UserDefaultBannerImages, UserDefaultProfileImages } from "src/static/s3-default-urls";

export enum UserRoles {
  ADMIN = "admin",
  COMPANY = "company",
  NGO = "ngo",
  VOLUNTEER = "volunteer",
  CAMPAIGN_MANAGER = "campaign_manager",
}

export enum SocialType {
  FACEBOOK = "facebook",
  APPLE = "apple",
  GOOGlE = "google",
}

export enum RegistrationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// ** NGO/COMPANY related fields
abstract class Content extends BaseEntity {
  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  regNumber: string;

  @CreateDateColumn({ nullable: true })
  dateOfReg: Date;

  @Column({ nullable: true })
  taxIdentificationNumber: string;

  @Column({ nullable: true })
  certificateOfReg: string;

  @Column({ nullable: true })
  csrPolicyDoc: string;

  @Column({
    type: "enum",
    enum: RegistrationStatus,
    nullable: true,
    default: RegistrationStatus.PENDING,
  })
  registrationStatus: RegistrationStatus;
}

@Entity("user")
export class User extends Content {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ nullable: true })
  bannerImage: string;

  @Column({ nullable: true })
  about: string;

  @Column({ select: false, nullable: true })
  password: string;

  @Column({ type: "enum", enum: UserRoles, default: UserRoles.VOLUNTEER })
  role: UserRoles;

  @Column({ type: "enum", enum: ActivationStatus, default: ActivationStatus.ACTIVE })
  activationStatus: ActivationStatus;

  @OneToMany(() => ActivationChangeLog, activationChangeLog => activationChangeLog.event)
  activationChangeLogs: ActivationChangeLog[];

  @Column({ nullable: true })
  phoneNumber: string;

  // ** Address Information ===================
  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  streetAddress: string;

  @Column({ nullable: true })
  postalCode: string;

  // ** URLs we accepts ========================
  @Column({ nullable: true })
  facebookUrl: string;

  @Column({ nullable: true })
  twitterUrl: string;

  @Column({ nullable: true })
  linkedinUrl: string;

  @Column({ nullable: true })
  youtubeUrl: string;

  @Column({ type: "enum", enum: SocialType, nullable: true })
  socialType: SocialType;

  @Column({ nullable: true })
  deletedAt: Date;

  @Column({ default: 0 })
  otpResendAttempts: number;

  @Column({ nullable: true })
  blockExpiresAt: Date;

  @Column({ nullable: true })
  resetPasswordLinkUsed: boolean;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ default: null })
  lastOnline: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @VersionColumn({ nullable: true })
  _v: number;

  // ===== OneToOne ==========
  @OneToOne(() => Wallet, wallet => wallet.user)
  wallet: Wallet;

  // ===== OneToMany ==========
  @ManyToOne(() => User, { cascade: true })
  campaignManagerCreatedBy: User;

  // ===== OneToMany ==========
  @OneToMany(() => Otp, otp => otp.user)
  otps: Otp[];

  @OneToMany(() => Event, event => event.user)
  events: Event[];

  @OneToMany(() => InterestedLocation, userlocation => userlocation.user, {
    cascade: true,
  })
  interestedLocations: InterestedLocation[];

  // ** the one you are following
  @OneToMany(() => Follow, follow => follow.follower)
  following: Follow[];

  // ** who are following you
  @OneToMany(() => Follow, follow => follow.followee)
  followers: Follow[];

  @OneToMany(() => LoginAttempt, loginAttempt => loginAttempt.user)
  loginAttempts: LoginAttempt[];

  @OneToMany(() => Product, product => product.user)
  products: Product[];

  @OneToMany(() => Deal, deal => deal.user)
  deals: Deal[];

  @OneToMany(() => Wishlist, wishlist => wishlist.user)
  wishlist: Wishlist[];

  @OneToMany(() => Donation, donation => donation.user)
  donations: Donation[];

  @OneToMany(() => Goal, goal => goal.user)
  goals: Goal[];

  @OneToMany(() => Community, community => community.createdBy)
  createdCommunities: Community[];

  @OneToMany(() => Post, post => post.author)
  posts: Post[];

  @OneToMany(() => VolunteerRequest, volunteerRequest => volunteerRequest.user)
  volunteerRequests: VolunteerRequest[];

  @OneToMany(() => ChatParticipant, chatParticipant => chatParticipant.user)
  chatParticipants: ChatParticipant[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

  @OneToMany(() => Story, story => story.user)
  stories: Story[];

  // ===== ManyToMany ==========
  @ManyToMany(() => Topic)
  @JoinTable()
  topics: Topic[];

  @ManyToMany(() => LifeStage)
  @JoinTable()
  lifeStages: LifeStage[];

  @ManyToMany(() => Sdg)
  @JoinTable()
  sdgs: Sdg[];

  @ManyToMany(() => Post, post => post.likes)
  likedPosts: Post[];

  @ManyToMany(() => Event, event => event.registrations)
  registeredEvents: Event[];

  @ManyToMany(() => Story, story => story.seenBy)
  seenStories: Story[];

  @ManyToMany(() => Story, story => story.likedBy)
  likedStories: Story[];

  @ManyToMany(() => Story, story => story.sharedBy)
  sharedStories: Story[];

  @OneToMany(() => Event, event => event.campaignManager)
  assignedEvents: Event[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      const salt = await bcrypt.genSalt();
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  @BeforeInsert()
  setDefaultImages() {
    switch (this.role) {
      case UserRoles.ADMIN:
        this.bannerImage = this.bannerImage || UserDefaultBannerImages.ADMIN;
        this.profileImage = this.profileImage || UserDefaultProfileImages.ADMIN;
        break;
      case UserRoles.COMPANY:
        this.bannerImage = this.bannerImage || UserDefaultBannerImages.COMPANY;
        this.profileImage = this.profileImage || UserDefaultProfileImages.COMPANY;
        break;
      case UserRoles.NGO:
        this.bannerImage = this.bannerImage || UserDefaultBannerImages.NGO;
        this.profileImage = this.profileImage || UserDefaultProfileImages.NGO;
        break;
      case UserRoles.VOLUNTEER:
        this.bannerImage = this.bannerImage || UserDefaultBannerImages.VOLUNTEER;
        this.profileImage = this.profileImage || UserDefaultProfileImages.VOLUNTEER;
        break;
      case UserRoles.CAMPAIGN_MANAGER:
        this.bannerImage = this.bannerImage || UserDefaultBannerImages.CAMPAIGN_MANAGER;
        this.profileImage = this.profileImage || UserDefaultProfileImages.CAMPAIGN_MANAGER;
        break;
      default:
        this.bannerImage = this.bannerImage || UserDefaultBannerImages.VOLUNTEER;
        this.profileImage = this.profileImage || UserDefaultProfileImages.VOLUNTEER;
    }
  }
}
