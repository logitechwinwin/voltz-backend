import { Expose } from "class-transformer";
import { UserRoles } from "src/modules/user/user.entity";
import { ActivationStatus } from "src/shared/enums";

export class VolunteerDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  profileImage: string;

  @Expose()
  bannerImage: string;

  @Expose()
  about: string;

  @Expose()
  role: UserRoles;

  @Expose()
  country: string;

  @Expose()
  state: string;

  @Expose()
  city: string;

  @Expose()
  streetAddress: string;

  @Expose()
  postalCode: string;

  @Expose()
  isOnline: boolean;

  @Expose()
  activationStatus: ActivationStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  followersCount: number;

  @Expose()
  phoneNumber: string;
}
