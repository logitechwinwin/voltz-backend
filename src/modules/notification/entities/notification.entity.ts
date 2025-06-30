import { User } from "src/modules/user/user.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";

export enum NotificationStatus {
  SENT = "sent",
  READ = "read",
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  data: string;

  @ManyToOne(() => User, user => user.notifications)
  user: User;

  @Column({
    type: "enum",
    enum: NotificationStatus,
    default: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @CreateDateColumn()
  createdAt: Date;
}
