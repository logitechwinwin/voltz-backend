import { Deal } from "src/modules/deal/entities/deal.entity";
import { User } from "src/modules/user/user.entity";
import { WalletTransaction } from "src/modules/wallet-transaction/entities/wallet-transaction.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum DealRequestStatuses {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Entity()
export class DealRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Deal, deal => deal.dealRequests)
  @JoinColumn()
  deal: Deal;

  @ManyToOne(() => User)
  company: User;

  @ManyToOne(() => User)
  requestor: User;

  @OneToOne(() => WalletTransaction)
  @JoinColumn()
  transaction: WalletTransaction;

  @Column({ type: "enum", enum: DealRequestStatuses, default: DealRequestStatuses.PENDING })
  status: DealRequestStatuses;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
