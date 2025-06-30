import { User } from "src/modules/user/user.entity";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Goal extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  month: Date;

  @Column({ type: "float", nullable: true })
  workingHours: number;

  @ManyToOne(() => User, user => user.goals)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
