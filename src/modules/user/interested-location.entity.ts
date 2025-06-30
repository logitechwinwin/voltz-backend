import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./user.entity"; // Adjust the import based on your file structure

@Entity()
export class InterestedLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  country: string;

  @ManyToOne(() => User, user => user.interestedLocations)
  user: User;
}
