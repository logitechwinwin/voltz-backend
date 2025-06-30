import { Event } from "src/modules/event/entities/event.entity";
import { User } from "src/modules/user/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export enum DonationStatuses {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Entity()
export class Donation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.donations)
  user: User;

  @ManyToOne(() => Event, event => event.donations, { onDelete: "CASCADE" })
  event: Event;

  @Column({
    type: "float",
    nullable: true,
  })
  amount: number;

  @Column()
  currency: string;

  @Column({
    type: "enum",
    enum: DonationStatuses,
    default: DonationStatuses.PENDING,
  })
  status: DonationStatuses;

  @Column({ nullable: true })
  onlineToken: string;

  @CreateDateColumn()
  donatedAt: Date;
}
