import { BadRequestException, Injectable } from "@nestjs/common";
import FB from "fb";
@Injectable()
export class FacebookAuthService {
  async verifyToken(token: string) {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        FB.api(
          "me",
          { fields: "id,first_name,last_name,email", access_token: token },
          (res: any) => {
            if (!res || res.error) {
              reject(res?.error || new Error("Unknown Facebook error"));
            } else {
              resolve(res);
            }
          }
        );
      });
      return response;
    } catch (error) {
      throw new BadRequestException("Invalid Facebook token");
    }
  }
}

