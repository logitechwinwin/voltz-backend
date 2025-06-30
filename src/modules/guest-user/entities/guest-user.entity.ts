import { PaymentIntent } from "src/shared/entities/payment-intent.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class GuestUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @OneToMany(() => PaymentIntent, paymentIntent => paymentIntent.guestUser)
  paymentIntents: PaymentIntent[];
}
