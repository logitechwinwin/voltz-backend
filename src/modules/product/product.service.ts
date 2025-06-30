import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { Product } from "./entities/product.entity";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { User } from "../user/user.entity";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { IPaginationOptions, paginate, Pagination } from "nestjs-typeorm-paginate";
import { S3Service } from "../s3/s3.service";
import { Deal } from "../deal/entities/deal.entity";
import { ProductS3Paths } from "src/static/s3-paths";
import { GetAllProductsDto } from "./dto/get-all-products.dto";

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,

    private readonly s3Service: S3Service,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    const { name, description, image, price } = createProductDto;
    const imagePath = await this.s3Service.uploadFile(image, ProductS3Paths.IMAGES);

    const product = this.productRepository.create({
      name,
      description,
      price,
      image: imagePath,
      user: user,
    });

    const savedProduct = await product.save();
    return savedProduct;
  }

  async findAll(getAllData: GetAllProductsDto): Promise<Pagination<Product>> {
    const { page, perPage, search, userId } = getAllData;
    const queryBuilder = this.productRepository.createQueryBuilder("product");

    // Adding search functionality
    if (search) {
      queryBuilder.where("product.name ILIKE :search", {
        search: `%${search}%`,
      });
    }

    if (userId) {
      queryBuilder.andWhere("product.userId = :userId", { userId });
    }

    queryBuilder.andWhere("product.deletedAt IS NULL").orderBy(`product.createdAt`, "ASC");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate<Product>(queryBuilder, paginationOptions);
  }

  async findOne(id: number, user: User): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        id,
        user: { id: user.id },
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException("Product does not exist");
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto, user: User) {
    const { image } = updateProductDto;

    const product = await this.productRepository.findOne({
      where: {
        id,
        user: { id: user.id },
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException("Product does not exists");
    }

    Object.assign(product, updateProductDto);

    if (image) {
      product.image = await this.s3Service.uploadFile(image, ProductS3Paths.IMAGES);
    }

    return product.save();
  }

  async delete(id: number) {
    const product = await this.productRepository.findOneBy({
      id: id,
      deletedAt: null,
    });

    if (!product) {
      throw new NotFoundException("Product does not exists");
    }

    const dealsInWhichProductExists = await this.dealRepository.find({
      where: {
        products: {
          id: product.id,
        },
      },
      relations: ["products"],
    });

    if (dealsInWhichProductExists.length > 0) {
      throw new BadRequestException(
        "Please first delete those deals which has this products, or remove this product from the deals",
      );
    }

    return product.softRemove();
  }
}
