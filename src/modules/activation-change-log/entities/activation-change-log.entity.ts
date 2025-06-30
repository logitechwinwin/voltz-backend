import { Community } from "src/modules/community/entities/community.entity";
import { Deal } from "src/modules/deal/entities/deal.entity";
import { Event } from "src/modules/event/entities/event.entity";
import { User } from "src/modules/user/user.entity";
import { ActivationStatus } from "src/shared/enums";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class ActivationChangeLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reason: string;

  @Column({ type: "enum", enum: ActivationStatus })
  status: ActivationStatus;

  // ** when the ngo or company becomes inactive and all of the events or deals get inactive this is true for event or deal respectively
  @Column({ default: false })
  isCreatorInactive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Event, event => event.activationChangeLogs, { nullable: true })
  @JoinColumn({ name: "eventId" })
  event?: Event;

  @ManyToOne(() => Deal, deal => deal.activationChangeLogs, { nullable: true })
  @JoinColumn({ name: "dealId" })
  deal?: Deal;

  @ManyToOne(() => Community, community => community.activationChangeLogs, { nullable: true })
  @JoinColumn({ name: "communityId" })
  community?: Community;

  @ManyToOne(() => User, user => user.activationChangeLogs, { nullable: true })
  @JoinColumn({ name: "userId" })
  user?: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "adminId" })
  admin: User;
}
