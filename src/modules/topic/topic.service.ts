import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Topic } from "./entities/topic.entity";
import { ILike, Not, Repository } from "typeorm";
import { CreateTopicDto } from "./dto/create-topic.dto";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { paginate, Pagination, IPaginationOptions } from "nestjs-typeorm-paginate";
import { UpdateTopicDto } from "./dto/update-topic.dto";

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
  ) {}

  async create(createTopicData: CreateTopicDto) {
    const topic = await this.topicRepository.findOne({
      where: {
        label: ILike(createTopicData.label),
      },
    });

    if (topic) {
      throw new BadRequestException("Life stage already exists with this label");
    }

    const newTopic = this.topicRepository.create({
      ...createTopicData,
    });

    return newTopic.save();
  }

  async update(updateTopicData: UpdateTopicDto, topicId: number) {
    const topic = await this.topicRepository.findOne({
      where: { label: ILike(updateTopicData.label), id: Not(topicId) },
    });

    // ** topic must be unique
    if (topic) {
      throw new BadRequestException("Label already exists, use different label");
    }

    // ** topic must exists
    const updateTopic = await this.topicRepository.findOneBy({
      id: topicId,
      deletedAt: null,
    });

    if (!updateTopic) {
      throw new NotFoundException("Topic does not exists");
    }

    updateTopic.label = updateTopicData.label;

    // ** save updated topic
    return updateTopic.save();
  }

  async getAll(getAllTopicData: GetAllDto): Promise<Pagination<Topic>> {
    const { page, perPage, search } = getAllTopicData;

    const queryBuilder = this.topicRepository.createQueryBuilder("topic");

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

    return paginate<Topic>(queryBuilder, paginationOptions);
  }

  async deleteOne(topicId: number) {
    const topic = await this.topicRepository.findOneBy({
      id: topicId,
      deletedAt: null,
    });

    if (!topic) {
      throw new NotFoundException("Topic does not exists");
    }

    return topic.softRemove();
  }
}
