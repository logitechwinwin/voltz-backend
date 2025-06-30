import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateLifeStageDto } from "./dto/create-life-stage.dto";
import { UpdateLifeStageDto } from "./dto/update-life-stage.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { LifeStage } from "./entities/life-stage.entity";
import { ILike, Not, Repository } from "typeorm";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";

@Injectable()
export class LifeStageService {
  constructor(
    @InjectRepository(LifeStage)
    private readonly lifeStageRepository: Repository<LifeStage>,
  ) {}

  async create(createLifeStageDto: CreateLifeStageDto) {
    const lifeStage = await this.lifeStageRepository.findOne({
      where: {
        label: ILike(createLifeStageDto.label),
      },
    });

    if (lifeStage) {
      throw new BadRequestException("Life stage already exists with this label");
    }

    const newLifeStage = this.lifeStageRepository.create({
      ...createLifeStageDto,
    });

    return newLifeStage.save();
  }

  async update(lifeStageId: number, updateLifeStageDto: UpdateLifeStageDto) {
    const lifeStage = await this.lifeStageRepository.findOne({
      where: { label: ILike(updateLifeStageDto.label), id: Not(lifeStageId) },
    });

    // ** life state must be unique
    if (lifeStage) {
      throw new BadRequestException("Life stage already exists, use different label");
    }

    // ** life stage must exists
    const updateLifeStage = await this.lifeStageRepository.findOneBy({
      id: lifeStageId,
      deletedAt: null,
    });

    if (!updateLifeStage) {
      throw new NotFoundException("Life stage does not exists");
    }

    updateLifeStage.label = updateLifeStageDto.label;

    // ** save updated life stage
    return updateLifeStage.save();
  }

  async findAll(getAllLifeStagesData: GetAllDto) {
    const { page, perPage, search } = getAllLifeStagesData;

    const queryBuilder = this.lifeStageRepository.createQueryBuilder("topic");

    // Adding search functionality
    if (search) {
      queryBuilder.where("topic.label ILIKE :search", {
        search: `%${search}%`,
      });
    }

    queryBuilder.andWhere("topic.deletedAt IS NULL").orderBy(`topic.createdAt`, "DESC");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate<LifeStage>(queryBuilder, paginationOptions);
  }

  async delete(lifeStageId: number) {
    const lifeStage = await this.lifeStageRepository.findOneBy({
      id: lifeStageId,
      deletedAt: null,
    });

    if (!lifeStage) {
      throw new NotFoundException("Life stage does not exists");
    }

    return lifeStage.softRemove();
  }
}
