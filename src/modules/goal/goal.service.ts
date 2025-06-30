import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { Goal } from "./entities/goal.entity";
import { Between, Repository } from "typeorm";
import { User } from "../user/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { GetAllDto } from "./dto/get-all.dto";
import { IPaginationOptions, paginate, Pagination } from "nestjs-typeorm-paginate";
import { GetGoalStatsDto, StatsDuration } from "./dto/get-goal-stats.dto";
import { VolunteerRequest, VolunteerRequestStatus } from "../volunteer-request/entities/volunteer-request.entity";
import * as moment from "moment";
import { GetYearlyStatsDto } from "./dto/get-yearly-stats.dto";

@Injectable()
export class GoalService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(VolunteerRequest)
    private readonly volunteerRequestRepository: Repository<VolunteerRequest>,
  ) {}

  async create(createGoalDto: CreateGoalDto, user: User) {
    // Get the first day of the current month as a Date object
    const currentMonthStart = moment().startOf("month").toDate();

    // ** Validate that the working hours do not exceed the total hours in the current month
    const totalHoursInMonth = moment().daysInMonth() * 24;
    if (createGoalDto.workingHours > totalHoursInMonth) {
      throw new BadRequestException("Working hours exceed the total hours available in the month.");
    }

    // Check if a goal for the current month already exists
    const existingGoal = await this.goalRepository.findOne({
      where: { user: { id: user.id }, month: currentMonthStart },
    });
    if (existingGoal) {
      throw new BadRequestException(`Goal for ${moment(currentMonthStart).format("MMMM")} already exists.`);
    }

    const newGoal = this.goalRepository.create({
      ...createGoalDto,
      month: currentMonthStart,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        activationStatus: user.activationStatus,
        phoneNumber: user.phoneNumber,
      },
    });

    const createdGoal = await newGoal.save();
    return createdGoal;
  }

  async findAll(getAllData: GetAllDto): Promise<Pagination<Goal>> {
    const { page, perPage, userId, currentMonth } = getAllData;
    const queryBuilder = this.goalRepository
      .createQueryBuilder("goal")
      .where("goal.userId = :userId", { userId })
      .andWhere("goal.deletedAt IS NULL")
      .orderBy(`goal.createdAt`, "DESC");

    //  filter only the current month's goals
    if (currentMonth) {
      const currentDate = moment();
      queryBuilder
        .andWhere("EXTRACT(YEAR FROM goal.createdAt) = :year", { year: currentDate.year() })
        .andWhere("EXTRACT(MONTH FROM goal.createdAt) = :month", { month: currentDate.month() + 1 });
    }

    const paginationOptions: IPaginationOptions = {
      page: page,
      limit: perPage,
    };

    return paginate<Goal>(queryBuilder, paginationOptions);
  }

  async getGoalStats(getGoalStatsDto: GetGoalStatsDto): Promise<any> {
    const { userId, duration } = getGoalStatsDto;

    // 1. Determine the start date based on the provided duration
    let startDate: moment.Moment;
    switch (duration) {
      case StatsDuration["1M"]:
        startDate = moment().startOf("month");
        break;
      case StatsDuration["3M"]:
        startDate = moment().subtract(2, "months").startOf("month");
        break;
      case StatsDuration["6M"]:
        startDate = moment().subtract(5, "months").startOf("month");
        break;
      case StatsDuration["1Y"]:
        startDate = moment().startOf("year");
        break;
      case StatsDuration.ALL:
        startDate = moment().subtract(100, "years"); // Arbitrary large date to include all records
        break;
      default:
        throw new BadRequestException("Invalid duration");
    }
    const endDate = moment().endOf("day");

    // 2. Fetch volunteer requests within the duration where the status is ACCEPTED
    const volunteerRequests = await this.volunteerRequestRepository
      .createQueryBuilder("request")
      .where("request.userId = :userId", { userId })
      .andWhere("request.status = :status", { status: VolunteerRequestStatus.ACCEPTED })
      .andWhere("request.createdAt BETWEEN :startDate AND :endDate", {
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
      })
      .select("SUM(request.actualHours)", "totalActualHours")
      .getRawOne();

    const totalWorkingHours = parseFloat(volunteerRequests?.totalActualHours || 0);

    // 3. Fetch user goals within the specified duration
    const userGoals = await this.goalRepository.find({ where: { user: { id: userId } } });

    // 4. Calculate total goal hours across all goals in the specified duration
    const totalGoalHours = userGoals.reduce((total, goal) => {
      const goalMonth = moment(goal.month);
      if (goalMonth.isBetween(startDate, endDate, undefined, "[]")) {
        total += goal.workingHours;
      }
      return total;
    }, 0);

    // 5. Calculate the percentage of actual hours vs goal hours
    const percentage = totalGoalHours > 0 ? (totalWorkingHours / totalGoalHours) * 100 : 0;

    return {
      totalHours: totalGoalHours,
      totalWorkingHours: totalWorkingHours,
      percentage: parseFloat(percentage.toFixed(2)), // Rounded to two decimal places
    };
  }

  async getYearlyTarget(getYearlyStatsDto: GetYearlyStatsDto) {
    const { userId } = getYearlyStatsDto;
    const startOfYear = moment().startOf("year").toDate(); // January 1st of the current year
    const endOfYear = moment().endOf("year").toDate(); // December 31st of the current year

    // ** Retrieve all goals for the current year for user
    const goals = await this.goalRepository.find({
      where: {
        user: { id: userId },
        month: Between(startOfYear, endOfYear),
      },
      order: {
        month: "ASC", // Order by month
      },
    });

    // Initialize the response object with (Structure the data by month from January to December) and empty hours:
    const monthlyAchievements = Array(12)
      .fill(null)
      .map((_, index) => {
        const monthName = moment().month(index).format("MMM"); // Format as month name
        const monthMaxHours = moment().month(index).daysInMonth() * 24; // Calculate max hours for the month
        return {
          month: monthName,
          monthMaxhours: monthMaxHours,
          goalHours: 0,
          workingHours: 0,
        };
      });

    // ** Populate the data for each month
    await Promise.all(
      goals.map(async goal => {
        const monthIndex = goal.month.getMonth();
        monthlyAchievements[monthIndex].goalHours = goal.workingHours || 0;

        // ** Calculate the actual working hours for the goal using VolunteerRequests
        const volunteerRequests = await this.volunteerRequestRepository
          .createQueryBuilder("request")
          .where("request.userId = :userId", { userId: userId })
          .andWhere("request.status = :status", { status: VolunteerRequestStatus.ACCEPTED })
          .andWhere("request.createdAt BETWEEN :startDate AND :endDate", {
            startDate: moment(goal.month).startOf("month").toDate(),
            endDate: moment(goal.month).endOf("month").toDate(),
          })
          .select("SUM(request.actualHours)", "totalHours")
          .getRawOne();

        monthlyAchievements[monthIndex].workingHours = parseFloat(volunteerRequests?.totalHours || 0);
      }),
    );

    return monthlyAchievements;
  }

  async update(goalId: number, updateGoalDto: UpdateGoalDto) {
    // Get the first day of the current month as a Date object
    const currentMonthStart = moment().startOf("month").toDate();

    // ** Validate that the working hours do not exceed the total hours in the current month
    const totalHoursInMonth = moment().daysInMonth() * 24;
    if (updateGoalDto.workingHours > totalHoursInMonth) {
      throw new BadRequestException("Working hours exceed the total hours available in the month.");
    }

    // Check updated goal for the current month already exists
    const goal = await this.goalRepository.findOne({
      where: { id: goalId, month: currentMonthStart },
    });

    if (!goal) {
      throw new NotFoundException("Goal not found.");
    }

    // Update the goal properties
    Object.assign(goal, updateGoalDto);
    return this.goalRepository.save(goal);
  }
}
