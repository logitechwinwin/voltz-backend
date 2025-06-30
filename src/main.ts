import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { useContainer } from "class-validator";
import { formateValidationException } from "./utils/formate-validation-exception";
import { NestExpressApplication } from "@nestjs/platform-express";
import { EntityManager } from "typeorm";
import { WebsocketAdapter } from "./modules/chat/socket.adapter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: ["debug", "error", "verbose", "warn", "log"],
  });
//  app.enableCors(origin: process.env.CORS_ORIGIN.split(','), credentials: true,);
  app.enableCors();
  app.useBodyParser("json", { limit: "50mb" });
  app.useBodyParser("urlencoded", { limit: "50mb", extended: true });
  app.useStaticAssets("public");
  app.setGlobalPrefix("/api/v1");

  // The validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, // ** OVERRIDE THE STATUS
      stopAtFirstError: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: formateValidationException,
    }),
  );

  // ** WEB SOCKET INITIALIZATION
  const entityManager = app.get(EntityManager);
  const adapter = new WebsocketAdapter(app, entityManager);
  app.useWebSocketAdapter(adapter);

  useContainer(app.select(AppModule), {
    fallbackOnErrors: true,
  });

  await app.listen(process.env.PORT);
}

bootstrap();
