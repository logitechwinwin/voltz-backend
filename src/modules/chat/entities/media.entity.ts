import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Message } from "./message.entity";

export enum ChatMediaTypes {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  FILE = "file",
}

@Entity()
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filePath: string; // Path to the media file

  @Column({ type: "enum", enum: ChatMediaTypes })
  mediaType: ChatMediaTypes; // Type of media file

  @OneToMany(() => Message, message => message.media)
  messages: Message[];
}
