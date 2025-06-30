import { GuestUser } from "src/modules/guest-user/entities/guest-user.entity";
import { User } from "src/modules/user/user.entity";
import { VoltzType } from "src/modules/wallet-transaction/entities/wallet-transaction.entity";
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

export enum PaymentIntentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  CREDITED_TO_WALLET = "credited_to_wallet",
  FAILED = "failed",
}

// ** Used whenever ngo buys voltz
@Entity()
export class PaymentIntent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "userId" })
  user?: User;

  @ManyToOne(() => GuestUser, { nullable: true })
  @JoinColumn()
  guestUser?: GuestUser;

  @Column({
    type: "float",
    nullable: false,
  })
  amount: number; // ** amount needed to buy these voltz

  @Column({
    type: "float",
    nullable: false,
  })
  voltzRequested: number;

  @Column({
    type: "enum",
    enum: VoltzType,
    default: VoltzType.ORDINARY,
  })
  voltzType: VoltzType;

  @Column({
    type: "varchar",
    length: 3,
    nullable: false,
    default: "USD", // Assuming default currency is USD, but it can be changed
  })
  currency: string;

  @Column({
    type: "enum",
    enum: PaymentIntentStatus,
    default: PaymentIntentStatus.PENDING,
  })
  status: PaymentIntentStatus;

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
  })
  onlineToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
