import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
  OneToOne,
} from "typeorm";
import { User } from "src/modules/user/user.entity";
import { WalletTransaction } from "src/modules/wallet-transaction/entities/wallet-transaction.entity";

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, user => user.wallet, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn()
  user: User;

  @Column({
    type: "float",
    nullable: false,
    default: 0,
  })
  balance: number;

  @Column({
    type: "decimal",
    nullable: false,
    default: 0.0,
  })
  foundationalVoltz: number;

  // Outgoing Transactions (outgoingTransactions): Reflects the list of transactions where this wallet sent funds out.
  @OneToMany(() => WalletTransaction, walletTransaction => walletTransaction.sourceWallet, { nullable: true })
  outgoingTransactions: WalletTransaction[];

  // Incoming Transactions (incomingTransactions): Reflects the list of transactions where this wallet received funds.
  @OneToMany(() => WalletTransaction, walletTransaction => walletTransaction.targetWallet, { nullable: true })
  incomingTransactions: WalletTransaction[];

  @OneToMany(() => WalletTransaction, walletTransaction => walletTransaction.targetWallet)
  foundationalTransactions: WalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
