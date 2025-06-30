import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
  BaseEntity,
  OneToMany,
} from "typeorm";
import { Product } from "src/modules/product/entities/product.entity";
import { User } from "src/modules/user/user.entity";
import { Category } from "src/modules/category/entities/category.entity";
import { DealRequest } from "src/modules/deal-request/entities/deal-request.entity";
import { ActivationChangeLog } from "src/modules/activation-change-log/entities/activation-change-log.entity";
import { ActivationStatus } from "src/shared/enums";

@Entity()
export class Deal extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bannerImage: string;

  @Column()
  dealName: string;

  @Column({ type: "float" })
  dealAmount: number;

  @Column({ type: "float", default: 0 })
  dealAmountAfterDiscount: number;

  @Column()
  discountAmount: number;

  @Column()
  discountType: string;

  @Column()
  from: Date;

  @Column()
  to: Date;

  @Column()
  voltzRequired: number;

  @Column({ nullable: true })
  about: string;

  @Column({ type: "int", default: 0 })
  availCount: number;

  @Column({ type: "enum", enum: ActivationStatus, default: ActivationStatus.ACTIVE })
  activationStatus: ActivationStatus;

  @OneToMany(() => ActivationChangeLog, activationChangeLog => activationChangeLog.deal)
  activationChangeLogs: ActivationChangeLog[];

  @ManyToMany(() => Product)
  @JoinTable()
  products: Product[];

  // deal creator
  @ManyToOne(() => User, user => user.deals)
  user: User;

  @ManyToMany(() => Category, category => category.deals)
  @JoinTable()
  category: Category[];

  @OneToMany(() => DealRequest, dealRequest => dealRequest.deal)
  dealRequests: DealRequest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
