import { ArgumentsHost, ExecutionContext, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Logger, LogLevel } from "./entities/logger.entity";
import { IResponse } from "src/shared/interfaces/response.interface";

interface LogParams {
  message: string;
  duration?: string;
  meta?: Record<string, any>;
  context?: Record<string, any>;
}

@Injectable()
export class LoggerService {
  constructor(
    @InjectRepository(Logger)
    private readonly loggerRepository: Repository<Logger>,
  ) {}

  async logException(exception: unknown, httpStatus: number, host: ArgumentsHost): Promise<void> {
    const request = host.switchToHttp().getRequest();

    // Prepare context object with full request details
    const contextData = {
      method: request.method,
      url: request.url,
      body: request.body,
      params: request.params,
      query: request.query,
      responseStatus: httpStatus,
      user: request.user && { id: request.user.id, role: request.user.role },
    };

    // Prepare meta data (user agent, IP, etc.)
    const metaData = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      referer: request.headers["referer"],
      host: request.headers["host"],
      stackTrace: exception instanceof Error ? exception.stack : undefined,
    };

    // Log the exception with context and meta
    await this.logError({
      message: `${exception instanceof Error ? exception.message : "Unknown error"}`,
      context: contextData,
      meta: metaData,
    });
  }

  async logResponseDetails(request: any, duration: string, data: IResponse, httpStatus: number) {
    const contextData = {
      method: request.method,
      url: request.url,
      body: request.body,
      params: request.params,
      query: request.query,
      responseStatus: httpStatus,
      user: request.user && { id: request.user.id, role: request.user.role },
    };

    // Prepare meta data (user agent, IP, etc.)
    const metaData = {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
      referer: request.headers["referer"],
      host: request.headers["host"],
    };

    // Log the successful response
    await this.logInfo({
      message: data?.message,
      context: contextData,
      duration,
      meta: metaData,
    });
  }

  // Method to log information
  async logInfo(params: LogParams) {
    await this.saveLog(LogLevel.INFO, params);
  }

  // Method to log errors
  async logError(params: LogParams) {
    await this.saveLog(LogLevel.ERROR, params);
  }

  // Helper method to save log entry
  private async saveLog(level: LogLevel, params: LogParams) {
    const logEntry = this.loggerRepository.create({
      level,
      message: params.message,
      duration: params.duration,
      context: params.context,
      meta: params.meta,
    });

    // Save the log entry to the database
    await this.loggerRepository.save(logEntry);
  }
}
