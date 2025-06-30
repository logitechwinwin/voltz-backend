import { ActivationChangeLog } from "src/modules/activation-change-log/entities/activation-change-log.entity";
import { Post } from "src/modules/post/entities/post.entity";
import { User } from "src/modules/user/user.entity";
import { ActivationStatus } from "src/shared/enums";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Community {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  bannerImage: string;

  @Column({ type: "enum", enum: ActivationStatus, default: ActivationStatus.ACTIVE })
  activationStatus: ActivationStatus;

  @OneToMany(() => ActivationChangeLog, activationChangeLog => activationChangeLog.deal)
  activationChangeLogs: ActivationChangeLog[];

  @ManyToOne(() => User, user => user.createdCommunities, { onDelete: "CASCADE" })
  createdBy: User;

  @ManyToMany(() => User)
  @JoinTable()
  members: User[];

  @OneToMany(() => Post, post => post.community)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
