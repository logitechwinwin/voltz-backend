import { Exclude, Expose } from "class-transformer";
import { RegistrationStatus, UserRoles } from "src/modules/user/user.entity";
import { ActivationStatus } from "src/shared/enums";

export class CompanyDto {
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
  name: string;

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
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  activationStatus: ActivationStatus;

  @Expose()
  phoneNumber: string;

  @Expose({ groups: [UserRoles.ADMIN] })
  regNumber: string;

  @Expose({ groups: [UserRoles.ADMIN] })
  dateOfReg: Date;

  @Expose({ groups: [UserRoles.ADMIN] })
  taxIdentificationNumber: string;

  @Expose({ groups: [UserRoles.ADMIN] })
  certificateOfReg: string;

  @Expose({ groups: [UserRoles.ADMIN] })
  csrPolicyDoc: string;

  @Expose({ groups: [UserRoles.ADMIN] })
  registrationStatus: RegistrationStatus;

  @Expose({ groups: [UserRoles.VOLUNTEER] })
  isFollowed: boolean;
}
