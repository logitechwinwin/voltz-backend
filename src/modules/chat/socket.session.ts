import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import { User } from "../user/user.entity";

export interface AuthenticatedSocket extends Socket {
  user?: User;
  userSocketId?: string;
}

export interface IGatewaySessionManager {
  getUserSockets(id: number): AuthenticatedSocket[] | undefined;
  setUserSocket(id: number, socket: AuthenticatedSocket): void;
  removeUserSocket(id: number, socketId: string): void;
  getSockets(): Map<number, AuthenticatedSocket[]>;
}

@Injectable()
export class GatewaySessionManager implements IGatewaySessionManager {
  private readonly sessions: Map<number, AuthenticatedSocket[]> = new Map();

  // Get all sockets for a specific user
  getUserSockets(userId: number): AuthenticatedSocket[] | undefined {
    return this.sessions.get(userId);
  }

  // Add a new socket for a user
  setUserSocket(userId: number, socket: AuthenticatedSocket): void {
    const userSockets = this.sessions.get(userId) || [];
    userSockets.push(socket);
    this.sessions.set(userId, userSockets);
  }

  // Remove a specific socket for a user
  removeUserSocket(userId: number, socketId: string): void {
    const userSockets = this.sessions.get(userId);
    if (userSockets) {
      const updatedSockets = userSockets.filter(socket => socket.id !== socketId);
      if (updatedSockets.length > 0) {
        this.sessions.set(userId, updatedSockets);
      } else {
        this.sessions.delete(userId); // Remove user from map if no sockets remain
      }
    }
  }

  // Get the entire map of user sockets
  getSockets(): Map<number, AuthenticatedSocket[]> {
    return this.sessions;
  }
}
