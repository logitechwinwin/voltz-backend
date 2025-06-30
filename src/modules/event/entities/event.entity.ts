import { ActivationChangeLog } from "src/modules/activation-change-log/entities/activation-change-log.entity";
import { Donation } from "src/modules/donation/entities/donation.entity";
import { LifeStage } from "src/modules/life-stage/entities/life-stage.entity";
import { Sdg } from "src/modules/sdg/entities/sdg.entity";
import { Topic } from "src/modules/topic/entities/topic.entity";
import { User } from "src/modules/user/user.entity";
import { VolunteerRequest } from "src/modules/volunteer-request/entities/volunteer-request.entity";
import { ActivationStatus } from "src/shared/enums";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Point,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum EventType {
  CAMPAIGN = "campaign",
  CHARITY = "charity",
}

@Entity()
export class Event extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({
    type: "enum",
    enum: EventType,
    default: EventType.CHARITY,
  })
  type: EventType;

  // ** Geofencing fields for campaigns
  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326, nullable: true })
  location: Point; // Stores latitude and longitude

  @Column({ type: "float", nullable: true })
  radius: number;

  @Column()
  description: string;

  @Column({ nullable: true })
  volunteerRequired: number;

  @Column()
  bannerImage: string;

  @Column()
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({
    nullable: true,
  })
  facebookUrl: string;

  @Column({
    nullable: true,
  })
  twitterUrl: string;

  @Column({
    nullable: true,
  })
  linkedinUrl: string;

  @Column({
    nullable: true,
  })
  youtubeUrl: string;

  @Column({
    default: 0.0,
    type: "float",
  })
  donationReceived: number;

  @Column({ nullable: true, type: "float" })
  donationRequired: number;

  @Column({ default: null })
  closed: Date;

  @Column({ type: "enum", enum: ActivationStatus, default: ActivationStatus.ACTIVE })
  activationStatus: ActivationStatus;

  @OneToMany(() => ActivationChangeLog, activationChangeLog => activationChangeLog.event)
  activationChangeLogs: ActivationChangeLog[];

  // ** Campaign Fields
  @Column({ nullable: true })
  voltzPerHour: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Sdg)
  @JoinTable()
  sdgs: Sdg[];

  // ** the creator of the event
  @ManyToOne(() => User, user => user.events)
  user: User;

  @ManyToMany(() => Topic)
  @JoinTable()
  topics: Topic[];

  @ManyToMany(() => LifeStage)
  @JoinTable()
  lifeStages: LifeStage[];

  @ManyToMany(() => User, user => user.registeredEvents)
  @JoinTable()
  registrations: User[];

  @OneToMany(() => VolunteerRequest, volunteerRequest => volunteerRequest.event)
  volunteerRequests: VolunteerRequest[];

  @OneToMany(() => Donation, donation => donation.event)
  donations: Donation[];

  @ManyToOne(() => User, user => user.assignedEvents)
  campaignManager: User;
}
