import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Post } from "./entities/post.entity";
import { Brackets, Not, Repository } from "typeorm";
import { User, UserRoles } from "../user/user.entity";
import { Community } from "../community/entities/community.entity";
import { GetAllPostsDto } from "./dto/get-all-posts.dto";
import { IPaginationOptions, paginate, paginateRaw, Pagination } from "nestjs-typeorm-paginate";
import { removeTablePrefix } from "src/utils/remove-table-prefix";

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,

    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
  ) {}

  async create(createPostDto: CreatePostDto, user: User) {
    const { content, communityId } = createPostDto;

    const community = await this.communityRepository
      .createQueryBuilder("community")
      .leftJoin("community.members", "member")
      .where("community.id = :communityId", { communityId })
      .andWhere(
        new Brackets(qb => {
          qb.where("member.id = :userId", { userId: user.id }).orWhere("community.createdBy = :userId", {
            userId: user.id,
          });
        }),
      )
      .getOne();

    if (!community) {
      throw new BadRequestException("Community doesn't belong to you");
    }

    const post = this.postRepository.create({
      content,
      community,
      author: user,
    });

    return post.save();
  }

  async findAll(user: User, getAllPostsDto: GetAllPostsDto) {
    const { search, page, perPage, communityId } = getAllPostsDto;

    const queryBuilder = this.postRepository
      .createQueryBuilder("post")
      .leftJoin("post.community", "community")
      .leftJoin("post.comments", "comments")
      .leftJoinAndSelect("post.author", "user")
      .leftJoin("post.likes", "likes") // Join the likes table
      .addSelect("COUNT(DISTINCT likes.id)", "likesCount") // Count the number of likes
      .addSelect("COUNT(DISTINCT comments.id)", "commentsCount") // Count the number of likes
      .where("community.id = :communityId", { communityId })
      .orderBy("post.pinned", "DESC")
      .addOrderBy(`post.createdAt`, "DESC");

    if (user) {
      queryBuilder
        .addSelect(["COALESCE(BOOL_OR(likes.id = :userId), false) AS isLiked"])
        .setParameters({ userId: user.id });
    }

    // Adding search functionality
    if (search) {
      queryBuilder.andWhere("post.content ILIKE :search", {
        search: `%${search}%`,
      });
    }

    // Group by post id to get the count of likes per post
    queryBuilder.groupBy("post.id").addGroupBy("user.id");

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    const rawResults = await paginateRaw(queryBuilder, paginationOptions);

    // Format results
    const formattedItems = rawResults.items.map((item: any) => ({
      id: item.post_id,
      content: item.post_content,
      pinned: item.post_pinned,
      createdAt: item.post_createdAt,
      updatedAt: item.post_updatedAt,
      deletedAt: item.post_deletedAt,
      isLiked: item.isliked,
      author: {
        id: item.user_id,
        email: item.user_email,
        profileImage: item.user_profileImage,
        name: item.user_role === UserRoles.NGO ? item.user_name : `${item.user_firstName} ${item.user_lastName}`,
        role: item.user_role,
        // Include other user details as needed
      },
      likesCount: parseInt(item.likesCount, 10), // Convert likesCount to integer
      commentsCount: parseInt(item.commentsCount, 10),
    }));

    return {
      items: formattedItems,
      meta: rawResults.meta,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} post`;
  }

  async update(postId: number, updatePostDto: UpdatePostDto, user: User) {
    const { pinned, unpinned } = updatePostDto;

    if (pinned || unpinned) {
      const post = await this.postRepository.findOne({
        relations: {
          community: {
            createdBy: true,
          },
          author: true,
        },
        where: {
          id: postId,
          community: {
            createdBy: { id: user.id },
          },
        },
      });

      if (!post) {
        throw new NotFoundException("Post not found");
      }

      if (pinned) {
        // ** unpinned any other pinned post in this community
        await this.postRepository.update(
          {
            community: {
              id: post.community.id,
            },
            pinned: true,
          },
          {
            pinned: false,
          },
        );

        post.pinned = true;
      } else {
        post.pinned = false;
      }

      return post.save();
    }

    // ** update anything else
    const post = await this.postRepository.findOne({
      relations: {
        community: {
          createdBy: true,
        },
        author: true,
      },
      where: {
        id: postId,
        author: {
          id: user.id,
        },
      },
    });

    if (!post) {
      throw new BadRequestException("Post doesn't exists");
    }

    post.content = updatePostDto.content;

    return await post.save();
  }

  async likePost(postId: number, user: User) {
    const post = await this.postRepository
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.likes", "like")
      .where("post.id = :postId", { postId })
      .andWhere(qb => {
        const subQuery = qb
          .subQuery()
          .select("1")
          .from("post_likes_user", "plu")
          .where("plu.postId = post.id")
          .andWhere("plu.userId = :userId")
          .getQuery();
        return `NOT EXISTS (${subQuery})`;
      })
      .setParameter("userId", user.id)
      .getOne();

    if (!post) {
      throw new BadRequestException("You have already liked this post");
    }

    post.likes.push(user);

    return post.save();
  }

  async unlikePost(postId: number, user: User) {
    const post = await this.postRepository
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.likes", "like") // Joins the likes
      .where("post.id = :postId", { postId }) // Check for the specific post
      .andWhere("like.id = :userId", { userId: user.id })
      .getOne();

    if (!post) {
      throw new BadRequestException("Please like first");
    }

    await this.postRepository.createQueryBuilder().relation(Post, "likes").of(post).remove(user);
  }

  async remove(postId: number, user: User) {
    const post = await this.postRepository.findOne({
      where: {
        id: postId,
      },
      relations: {
        author: true,
      },
    });

    if (!post) {
      throw new NotFoundException("Post doesn't exists");
    }

    if (post.author.id === user.id) {
      return await this.postRepository.softRemove(post);
    }

    const community = await this.communityRepository.findOne({
      relations: {
        posts: true,
        createdBy: true,
      },
      where: {
        createdBy: {
          id: user.id,
        },
        posts: {
          id: postId,
        },
      },
    });

    // ** community owner can delete any post
    if (community) {
      return await this.postRepository.softRemove(post);
    }
  }
}
