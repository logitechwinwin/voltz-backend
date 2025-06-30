import { User } from "src/modules/user/user.entity";
import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Chat } from "./chat.entity";

@Entity()
export class ChatParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Chat, chat => chat.participants)
  chat: Chat;
}
