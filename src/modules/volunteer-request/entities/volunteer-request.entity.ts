import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  Point,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Event } from "src/modules/event/entities/event.entity";
import { User } from "src/modules/user/user.entity";

export enum VolunteerRequestStatus {
  CHECKED_IN = "checked_in",
  PENDING = "pending", // when the user check out
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Entity()
export class VolunteerRequest extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.volunteerRequests)
  user: User;

  @ManyToOne(() => Event, event => event.volunteerRequests)
  event: Event;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  quotedHours: number;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  actualHours: number;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  voltzGiven: number;

  @Column({
    type: "enum",
    enum: VolunteerRequestStatus,
    default: VolunteerRequestStatus.PENDING,
  })
  status: VolunteerRequestStatus;

  // ** Check-in and checkout fields
  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326, nullable: true })
  checkInLocation: Point;

  @Column({ type: "geography", spatialFeatureType: "Point", srid: 4326, nullable: true })
  checkOutLocation: Point;

  @Column({ nullable: true })
  checkInAt: Date;

  @Column({ nullable: true })
  checkOutAt: Date;

  @Column({ nullable: true })
  isCheckoutWithinRadius: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
