import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { User } from "../user/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Post } from "../post/entities/post.entity";
import { Community } from "../community/entities/community.entity";
import { Comment } from "./entities/comment.entity";
import { GetAllCommentsDto } from "./dto/get-all-comments.dto";
import { IPaginationOptions, paginate } from "nestjs-typeorm-paginate";

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,

    @InjectRepository(Community)
    private communityRepository: Repository<Community>,

    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async create(createCommentDto: CreateCommentDto, currentUser: User) {
    const { content, postId } = createCommentDto;

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: {
        author: true,
        community: { createdBy: true, members: true },
      },
    });

    if (!post) {
      throw new BadRequestException("Post not found");
    }

    if (
      post.community.createdBy.id !== currentUser.id &&
      !post.community.members.some(member => member.id === currentUser.id)
    ) {
      throw new BadRequestException("Please join the community first");
    }

    const comment = this.commentRepository.create({
      content: content,
      commenter: currentUser,
      post: post,
    });

    return comment.save();
  }

  async findAll(getAllCommentsDto: GetAllCommentsDto) {
    const { postId, page, perPage } = getAllCommentsDto;

    const commentsQuery = this.commentRepository
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.commenter", "commenter")
      .orderBy("comment.createdAt", "DESC");

    if (postId) {
      commentsQuery.where("comment.postId = :postId", { postId });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const commentData = await paginate(commentsQuery, paginationOptions);

    return commentData;
  }

  findOne(id: number) {
    return `This action returns a #${id} comment`;
  }

  update(id: number, updateCommentDto: UpdateCommentDto) {
    return `This action updates a #${id} comment`;
  }

  async remove(id: number, user: User) {
    const comment = await this.commentRepository.findOne({
      where: { id: id },
      relations: { commenter: true, post: { community: { createdBy: true } } },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (user.id !== comment.commenter.id && user.id !== comment.post.community.createdBy.id) {
      throw new BadRequestException("Comment doesn't belong to you");
    }

    return this.commentRepository.softDelete(id);
  }
}
