import { InjectRepository } from "@nestjs/typeorm";
import { EventComment } from "./entities/event-comment.entity";
import { Repository } from "typeorm";
import { CreateEventCommentDto } from "./dto/create-event-comment.dto";
import { User } from "../user/user.entity";
import { Event } from "../event/entities/event.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";
import { GetAllEventCommentsDto } from "./dto/get-all-event-comments.dto";
import { ActivationStatus } from "src/shared/enums";

export class EventCommentsService {
  constructor(
    @InjectRepository(EventComment)
    private readonly eventCommentRepository: Repository<EventComment>,

    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(createEventCommentDto: CreateEventCommentDto, currentUser: User) {
    const { eventId, content } = createEventCommentDto;
    const event = await this.eventRepository.findOne({
      where: { id: eventId, activationStatus: ActivationStatus.ACTIVE, closed: null },
    });

    if (!event) {
      throw new BadRequestException("Comment is not allowed on this event");
    }

    const comment = this.eventCommentRepository.create({
      content: content,
      commenter: currentUser,
      event: event,
    });

    return comment.save();
  }

  async findAll(getAllCommentsDto: GetAllEventCommentsDto) {
    const { eventId, page, perPage } = getAllCommentsDto;

    const commentsQuery = this.eventCommentRepository
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.commenter", "commenter")
      .orderBy("comment.createdAt", "DESC");

    if (eventId) {
      commentsQuery.where("comment.eventId = :eventId", { eventId });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const commentData = await paginate(commentsQuery, paginationOptions);

    return commentData;
  }

  async remove(id: number, user: User) {
    const comment = await this.eventCommentRepository.findOne({
      where: { id: id },
      relations: { commenter: true, event: { user: true } },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (comment.commenter.id !== user.id && comment.event.user.id !== user.id) {
      throw new BadRequestException("You can't delete this comment");
    }
    return this.eventCommentRepository.softDelete(id);
  }
}
