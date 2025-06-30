import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinTable,
} from "typeorm";
import { Message } from "./message.entity";
import { ChatParticipant } from "./chat-participant.entity";
import { User } from "src/modules/user/user.entity";

export enum ChatType {
  INDIVIDUAL = "individual",
  GROUP = "group",
}

@Entity()
export class Chat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: ChatType, default: ChatType.INDIVIDUAL })
  type: ChatType;

  @Column({ nullable: true })
  name?: string; // For group chats

  @OneToOne(() => User, { createForeignKeyConstraints: false }) // ! WHY FOREIGN KEY CONSTRAINTS FALSE ??
  @JoinColumn()
  creator: User;

  @OneToMany(() => ChatParticipant, chatParticipant => chatParticipant.chat)
  participants: ChatParticipant[];

  @OneToMany(() => Message, message => message.chat, {
    cascade: ["insert", "remove", "update"],
  })
  @JoinColumn()
  messages: Message[];

  @OneToOne(() => Message)
  @JoinColumn()
  lastMessageSent: Message;

  @CreateDateColumn({ name: "created_at" })
  createdAt: number;

  @UpdateDateColumn({ name: "updated_at" }) // ! why name it updated_at ??
  lastMessageSentAt: Date;

  @UpdateDateColumn() // ! updatedAt and updated_at on the client side creates ambiguity, unclear
  updatedAt: Date;
}
