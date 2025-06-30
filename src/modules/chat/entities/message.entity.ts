import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Media } from "./media.entity";
import { Chat } from "./chat.entity";
import { User } from "src/modules/user/user.entity";

export enum MessageStatus {
  SENT = "sent",
  UNREAD = "unread",
  READ = "read",
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  content: string;

  @ManyToOne(() => User)
  sender: User;

  @ManyToOne(() => Chat, chat => chat.messages)
  chat: Chat;

  @ManyToOne(() => Media, media => media.messages, { nullable: true })
  media: Media;

  @Column({
    type: "enum",
    enum: MessageStatus,
    default: MessageStatus.UNREAD,
  })
  status: MessageStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
