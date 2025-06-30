import { BadRequestException, Injectable } from "@nestjs/common";
import FB from "fb";
@Injectable()
export class FacebookAuthService {
  async verifyToken(token: string) {
    try {
  //     const response = await FB.api("me", {
  //       fields: ["id", "first_name", "last_name", "email"],
  //       access_token: token,
  //     });
  //     return response;
       return [];
  } catch (error) {
      throw new BadRequestException("Invalid Facebook token");
    }
  }
}
