import { BadRequestException, Injectable } from "@nestjs/common";
import { verifyIdToken } from "apple-signin-auth";

@Injectable()
export class AppleAuthService {
  async verifyToken(idToken: string): Promise<any> {
    try {
      const appleUser = await verifyIdToken(idToken, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: true, // Optional, based on your needs
      });

      return appleUser;
    } catch (error) {
      throw new BadRequestException("Invalid Apple ID token");
    }
  }
}
