import { Module } from "@nestjs/common";
import { ProductService } from "./product.service";
import { ProductController } from "./product.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { SharedModule } from "src/shared/shared.module";
import { Product } from "./entities/product.entity";
import { S3Module } from "../s3/s3.module";
import { Deal } from "../deal/entities/deal.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Deal]), S3Module, SharedModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
