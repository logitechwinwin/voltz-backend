import { User } from "src/modules/user/user.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

export enum LoginType {
  FACEBOOK = "facebook",
  APPLE = "apple",
  GOOGlE = "google",
  EMAIL = "email",
  PHONE_NUMBER = "phonenumber",
}

@Entity()
export class LoginAttempt extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ default: null })
  expireAt: Date;

  @Column({ default: null })
  logoutAt: Date;

  @Column({ nullable: true })
  platform: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: "enum", enum: LoginType, default: LoginType.EMAIL })
  loginType: LoginType;

  @DeleteDateColumn()
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  userSocketId: string;

  @Column({ nullable: true })
  fcmDeviceToken: string; // Add deviceToken here

  @Column({ default: true })
  allowNotification: boolean;

  @ManyToOne(() => User, user => user.loginAttempts)
  @JoinColumn()
  user: User;
}
