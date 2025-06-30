import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateSdgDto } from "./dto/create-sdg.dto";
import { UpdateSdgDto } from "./dto/update-sdg.dto";
import { Sdg } from "./entities/sdg.entity";
import { Not, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { GetAllDto } from "src/shared/dtos/getAll.dto";
import { IPaginationOptions, paginate, Pagination } from "nestjs-typeorm-paginate";
import { Topic } from "../topic/entities/topic.entity";
import { S3Service } from "../s3/s3.service";
import { SdgS3Paths } from "src/static/s3-paths";

@Injectable()
export class SdgService {
  constructor(
    @InjectRepository(Sdg)
    private readonly sdgRepository: Repository<Sdg>,

    private readonly s3Service: S3Service,
  ) {}

  async create(createSdgData: CreateSdgDto) {
    const { label, image } = createSdgData;

    const imagePath = await this.s3Service.uploadFile(image, SdgS3Paths.IMAGES);

    const sdg = this.sdgRepository.create({ label, image: imagePath });

    return sdg.save();
  }

  async getAll(getAllData: GetAllDto): Promise<Pagination<Topic>> {
    const { page, perPage, search } = getAllData;

    const queryBuilder = this.sdgRepository.createQueryBuilder("sdg");

    // Adding search functionality
    if (search) {
      queryBuilder.where("sdg.label ILIKE :search", {
        search: `%${search}%`,
      });
    }

    queryBuilder.andWhere("sdg.deletedAt IS NULL").orderBy(`sdg.id`, "ASC");

    // Add more complex conditions here as needed
    // For example:
    // queryBuilder.andWhere('topic.status = :status', { status: 'active' });

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate<Sdg>(queryBuilder, paginationOptions);
  }

  async update(id: number, updateSdgDto: UpdateSdgDto) {
    const { label, image, color } = updateSdgDto;
    if (label) {
      const sdg = await this.sdgRepository.findOne({
        where: { label: label, id: Not(id) },
      });

      // ** sdg must be unique
      if (sdg) {
        throw new BadRequestException("Label already exists, use different label");
      }
    }

    // ** sdg must exists
    const updateSdg = await this.sdgRepository.findOneBy({
      id: id,
      deletedAt: null,
    });

    if (!updateSdg) {
      throw new NotFoundException("Sdg does not exists");
    }

    updateSdg.label = label || updateSdg.label;
    updateSdg.color = color || updateSdg.color;

    updateSdg.image = (image && (await this.s3Service.uploadFile(image, SdgS3Paths.IMAGES))) || updateSdg.image;

    // ** save updated sdg
    return updateSdg.save();
  }

  async delete(id: number) {
    const sdg = await this.sdgRepository.findOneBy({
      id: id,
      deletedAt: null,
    });

    if (!sdg) {
      throw new NotFoundException("Sdg does not exists");
    }

    return sdg.softRemove();
  }
}
