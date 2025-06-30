import { Comment } from "src/modules/comments/entities/comment.entity";
import { Community } from "src/modules/community/entities/community.entity";
import { User } from "src/modules/user/user.entity";
import {
  BaseEntity,
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
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column({ default: false })
  pinned: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => User, user => user.posts)
  author: User;

  @ManyToOne(() => Community, community => community.posts, { onDelete: "CASCADE" })
  community: Community;

  @ManyToMany(() => User)
  @JoinTable()
  likes: User[];

  @OneToMany(() => Comment, comment => comment.post)
  comments: Comment[];
}
