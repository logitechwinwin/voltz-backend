import { User } from "src/modules/user/user.entity";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
@Entity()
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  otp: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.otps, { onDelete: "CASCADE" })
  user: User;
}
