import { User } from "src/modules/user/user.entity";
import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";

@Entity("follow")
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  // you => who is following
  @ManyToOne(() => User, user => user.following)
  @JoinColumn()
  follower: User;

  // who is getting followed
  @ManyToOne(() => User, user => user.followers)
  @JoinColumn()
  followee: User;

  @CreateDateColumn()
  followedAt: Date;
}
