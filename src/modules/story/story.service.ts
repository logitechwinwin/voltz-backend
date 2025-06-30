import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateStoryDto } from "./dto/create-story.dto";
import { UpdateStoryDto } from "./dto/update-story.dto";
import { User } from "../user/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { S3Service } from "../s3/s3.service";
import { Story } from "./entities/story.entity";
import { LessThan, QueryBuilder, Repository } from "typeorm";
import { IPaginationOptions, paginateRaw } from "nestjs-typeorm-paginate";
import { GetRandomUsersStoriesDto } from "./dto/get-random-users-stories.dto";

import { Cron } from "@nestjs/schedule";
import * as moment from "moment";

@Injectable()
export class StoryService {
  constructor(
    @InjectRepository(Story)
    private storyRepository: Repository<Story>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    private readonly s3Service: S3Service,
  ) {}

  async create(createStoryDto: CreateStoryDto, user: User) {
    const { storyFile, ...storyData } = createStoryDto;

    const storyCount = await this.storyRepository.count({
      where: {
        user: { id: user.id },
      },
    });

    if (storyCount >= 3) {
      throw new BadRequestException("Maximum 3 stories can be uploaded");
    }

    const story = this.storyRepository.create();
    story.user = user;

    if (storyFile) {
      story.contentUrl = await this.s3Service.uploadFile(storyFile, "stories");
    }

    Object.assign(story, storyData);

    return this.storyRepository.save(story);
  }

  async toggleLike(storyId: number, user: User) {
    const story = await this.storyRepository.findOne({
      where: {
        id: storyId,
      },
      relations: ["likedBy"],
    });

    if (!story) {
      throw new BadRequestException("Story does not exists");
    }

    const hasLiked = await this.storyRepository
      .createQueryBuilder("story")
      .leftJoin("story.likedBy", "likers")
      .where("story.id = :storyId", { storyId })
      .andWhere("likers.id = :userId", { userId: user.id })
      .getCount();

    if (hasLiked > 0) {
      // User has already liked the story, so remove the like
      await this.storyRepository.createQueryBuilder().relation(Story, "likedBy").of(story).remove(user);
    } else {
      // User has not liked the story, so add the like
      await this.storyRepository.createQueryBuilder().relation(Story, "likedBy").of(story).add(user);
    }

    return;
  }

  async markSeen(storyId: number, user: User) {
    const story = await this.storyRepository.findOne({
      where: {
        id: storyId,
      },
      relations: ["seenBy"],
    });

    if (!story) {
      throw new BadRequestException("Story does not exists");
    }

    story.seenBy.push(user);

    return this.storyRepository.save(story);
  }

  async shared(storyId: number, user: User) {
    const story = await this.storyRepository.findOne({
      where: {
        id: storyId,
      },
      relations: ["sharedBy"],
    });

    if (!story) {
      throw new BadRequestException("Story does not exists");
    }

    story.sharedBy.push(user);

    return this.storyRepository.save(story);
  }

  async findAll(getRandomUsersStories: GetRandomUsersStoriesDto, user: User) {
    const { onlyMyStories } = getRandomUsersStories;

    const myStories = await this.storyRepository
      .createQueryBuilder("story")
      .leftJoinAndSelect("story.user", "user")
      .leftJoinAndSelect("story.likedBy", "likedBy")
      .leftJoinAndSelect("story.sharedBy", "sharedBy")
      .leftJoinAndSelect("story.seenBy", "seenBy")
      .select([
        "story.*",
        `COUNT(DISTINCT likedBy.id) AS "likesCount"`,
        `COUNT(DISTINCT sharedBy.id) AS "sharesCount"`,
        `COUNT(DISTINCT seenBy.id) AS "viewsCount"`,
        `(CASE WHEN COUNT(likedBy.id) > 0 AND COUNT(likedBy.id) FILTER (WHERE likedBy.id = :currentUserId) > 0 THEN true ELSE false END) AS "isLiked"`,
        `(CASE WHEN COUNT(sharedBy.id) > 0 AND COUNT(sharedBy.id) FILTER (WHERE sharedBy.id = :currentUserId) > 0 THEN true ELSE false END) AS "isShared"`,
        `(CASE WHEN COUNT(seenBy.id) > 0 AND COUNT(seenBy.id) FILTER (WHERE seenBy.id = :currentUserId) > 0 THEN true ELSE false END) AS "isSeen"`,
      ])
      .where("story.user = :userId", { userId: user.id })
      .groupBy("story.id")
      .addGroupBy("user.id")
      .orderBy("story.createdAt", "ASC")
      .setParameter("currentUserId", user.id)
      .getRawMany();

    if (onlyMyStories) {
      return { user: user, stories: myStories };
    }

    // Step 1: Randomly select users who have stories
    const randomUsers = await this.userRepository
      .createQueryBuilder("user")
      .innerJoin("user.stories", "story")
      .where("user.id != :currentUserId", { currentUserId: user.id })
      .groupBy("user.id")
      .orderBy("RANDOM()")
      .limit(11)
      .getMany();

    const allStories = [];

    // Step 2: Fetch all stories for each selected user with counts
    for (const randomUser of randomUsers) {
      const userStories = await this.storyRepository
        .createQueryBuilder("story")
        .leftJoinAndSelect("story.user", "user")
        .leftJoinAndSelect("story.likedBy", "likedBy")
        .leftJoinAndSelect("story.sharedBy", "sharedBy")
        .leftJoinAndSelect("story.seenBy", "seenBy")
        .select([
          "story.*",
          `COUNT(DISTINCT likedBy.id) AS "likesCount"`,
          `COUNT(DISTINCT sharedBy.id) AS "sharesCount"`,
          `COUNT(DISTINCT seenBy.id) AS "viewsCount"`,
          `(CASE WHEN COUNT(likedBy.id) > 0 AND COUNT(likedBy.id) FILTER (WHERE likedBy.id = :currentUserId) > 0 THEN true ELSE false END) AS "isLiked"`,
          `(CASE WHEN COUNT(sharedBy.id) > 0 AND COUNT(sharedBy.id) FILTER (WHERE sharedBy.id = :currentUserId) > 0 THEN true ELSE false END) AS "isShared"`,
          `(CASE WHEN COUNT(seenBy.id) > 0 AND COUNT(seenBy.id) FILTER (WHERE seenBy.id = :currentUserId) > 0 THEN true ELSE false END) AS "isSeen"`,
        ])
        .where("story.user = :userId", { userId: randomUser.id })
        .groupBy("story.id")
        .addGroupBy("user.id")
        .orderBy("story.createdAt", "ASC")
        .setParameter("currentUserId", user.id)
        .getRawMany();

      allStories.push({ user: randomUser, stories: userStories });
    }

    return { allStories, myStories: { user: user, stories: myStories } };
  }

  @Cron("0 * * * *") // Runs every hour
  async handleStoryCleanup() {
    const date = moment().subtract(1, "d").toDate();

    try {
      const oldStories = await this.storyRepository.find({
        where: {
          createdAt: LessThan(date),
        },
      });

      const storyPaths = [];
      for (const story of oldStories) {
        storyPaths.push(story.contentUrl);
        await this.storyRepository.remove(story);
      }

      await this.s3Service.deleteMultipleFiles(storyPaths);
    } catch (err) {
      console.log(err);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} story`;
  }

  update(id: number, updateStoryDto: UpdateStoryDto) {
    return `This action updates a #${id} story`;
  }

  async remove(id: number, user: User) {
    const story = await this.storyRepository.findOne({ where: { id }, relations: { user: true } });

    if (!story) {
      throw new BadRequestException("Story not found");
    }

    if (story.user.id !== user.id) {
      throw new BadRequestException("Story doesn't belong to you");
    }

    await this.s3Service.deleteFile(story.contentUrl);

    await this.storyRepository.remove(story);
  }
}
