import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum LogLevel {
  INFO = "INFO",
  ERROR = "ERROR",
  WARN = "WARN",
  DEBUG = "DEBUG",
}

@Entity()
export class Logger {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: "enum", enum: LogLevel })
  level: LogLevel;

  @Column({ type: "text", nullable: true })
  message?: string;

  @Column({ type: "varchar", nullable: true })
  duration?: string; // ** request to response duration

  @Column({ type: "jsonb" })
  context: Record<string, any>; // Core request/response details as JSON object

  @Column({ type: "jsonb", nullable: true })
  meta?: Record<string, any>; // Extra metadata (browser, IP, etc.)

  @CreateDateColumn()
  timestamp: Date;
}
