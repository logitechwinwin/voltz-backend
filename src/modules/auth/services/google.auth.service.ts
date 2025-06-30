import { BadRequestException, Injectable } from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get("socialAuth.google.clientId");
    console.log("Google Client ID:", this.clientId);
    this.client = new OAuth2Client(this.clientId);
  }

  async verifyToken(token: string, accessToken: string) {
    try {
      console.log("Verifying Google token:", token);
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.clientId,
      });
      if (!ticket) {
        throw new BadRequestException("Invalid Google token");
      }
      console.log("Google token verified successfully", ticket);
      ticket.getPayload();

      const { data } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        firstName: data.given_name,
        lastName: data.family_name,
        email: data.email,
      };
    } catch (error) {
      console.error("Google token verification failed:", error);
      throw new BadRequestException("Invalid Google token");
    }
  }
}
