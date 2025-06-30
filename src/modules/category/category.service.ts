import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "./entities/category.entity";
import { ILike, Not, Repository } from "typeorm";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { IPaginationOptions, paginate, Pagination } from "nestjs-typeorm-paginate";

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const topic = await this.categoryRepository.findOne({
      where: {
        label: ILike(createCategoryDto.label),
      },
    });

    if (topic) {
      throw new BadRequestException("Category already exists with this label");
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
    });

    return category.save();
  }

  async findAll(getAllData: GetAllDto): Promise<Pagination<Category>> {
    const { page, perPage, search } = getAllData;
    const queryBuilder = this.categoryRepository.createQueryBuilder("category");

    // Adding search functionality
    if (search) {
      queryBuilder.where("category.label ILIKE :search", {
        search: `%${search}%`,
      });
    }

    queryBuilder.andWhere("category.deletedAt IS NULL").orderBy(`category.createdAt`, "DESC");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate<Category>(queryBuilder, paginationOptions);
  }

  async update(updateCategoryDto: UpdateCategoryDto, categoryId: number): Promise<Category> {
    const categoryExists = await this.categoryRepository.findOne({
      where: { label: ILike(updateCategoryDto.label), id: Not(categoryId) },
    });

    if (categoryExists) {
      throw new BadRequestException("Category with this label already exists, use different label");
    }

    const category = await this.categoryRepository.findOne({
      where: {
        id: categoryId,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new BadRequestException("Category does not exists");
    }

    // ** Update the category label and save the changes
    category.label = updateCategoryDto.label;
    return category.save();
  }

  async remove(categoryId: number): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: {
        id: categoryId,
        deletedAt: null,
      },
      relations: { deals: true },
    });

    if (!category) {
      throw new NotFoundException("Category does not exists");
    }

    if (category.deals.length) {
      throw new BadRequestException("Category has deals, cannot be deleted");
    }

    await category.softRemove();
  }
}
