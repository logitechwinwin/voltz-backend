import { config } from "dotenv";
import { join } from "path";
import { CustomNamingStrategy } from "src/utils/custome-naming";
import { DataSource } from "typeorm";

config({
  // path: join(__dirname, ".env.production"), // Adjust the path to your .env file for production
  path: join(__dirname, ".env"), // Use .env for development
});

export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: true, //process.env.DB_SYNCHRONIZE === "true",
  migrations: ["migrations/**"],
  entities: ["./dist/modules/**/**.entity.ts"],
  namingStrategy: new CustomNamingStrategy(),
});
