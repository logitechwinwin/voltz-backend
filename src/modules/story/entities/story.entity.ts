import { User } from "src/modules/user/user.entity";
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

export enum StoryTypes {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
}

@Entity()
export class Story {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  contentUrl?: string;

  @Column({ nullable: true })
  text?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.stories)
  user: User;

  @ManyToMany(() => User, user => user.seenStories)
  @JoinTable()
  seenBy: User[];

  @ManyToMany(() => User, user => user.likedStories)
  @JoinTable()
  likedBy: User[];

  @ManyToMany(() => User, user => user.sharedStories)
  @JoinTable()
  sharedBy: User[];
}
