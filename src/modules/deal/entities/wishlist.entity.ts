import { Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Deal } from "./deal.entity";
import { User } from "src/modules/user/user.entity";

@Entity()
export class Wishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Deal, { onDelete: "CASCADE" })
  deal: Deal;

  @ManyToOne(() => User, user => user.wishlist, { onDelete: "CASCADE" })
  user: User;
}
