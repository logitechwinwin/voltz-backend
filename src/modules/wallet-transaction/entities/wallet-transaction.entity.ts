import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Deal } from "src/modules/deal/entities/deal.entity";
import { User } from "src/modules/user/user.entity";
import { Event } from "src/modules/event/entities/event.entity";
import { Wallet } from "src/modules/wallet/entities/wallet.entity";

export enum WalletTransactionTypes {
  TRANSFER = "transfer",
  PURCHASE = "purchase",
  DONATE = "donate",
}

export enum WalletTransactionStatus {
  HOLD = "hold",
  RELEASED = "released",
  CANCELLED = "cancelled",
}

export enum VoltzType {
  ORDINARY = "ordinary",
  FOUNDATIONAL = "foundational",
}
@Entity()
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Wallet, wallet => wallet.outgoingTransactions, { nullable: true })
  @JoinColumn({ name: "sourceWalletId" })
  sourceWallet?: Wallet;

  @ManyToOne(() => Wallet, wallet => wallet.incomingTransactions, { nullable: true })
  @JoinColumn({ name: "targetWalletId" })
  targetWallet: Wallet;

  @ManyToOne(() => Deal, { nullable: true })
  @JoinColumn({ name: "dealId" })
  deal?: Deal;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: "eventId" })
  event?: Event;

  // ** if transaction happened for the event by the campaignManager
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "campaignManagerId" })
  campaignManager?: User;

  @Column({
    type: "enum",
    enum: WalletTransactionTypes,
    nullable: true,
  })
  type: WalletTransactionTypes;

  @Column({
    type: "float",
    nullable: false,
  })
  amount: number; // ** number of voltz

  @Column({
    type: "enum",
    enum: VoltzType,
    default: VoltzType.ORDINARY,
  })
  voltzType: VoltzType;

  @Column({
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    type: "enum",
    enum: WalletTransactionStatus,
    default: WalletTransactionStatus.RELEASED,
  })
  status: WalletTransactionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
