import { Controller, Post, Body, Patch, Param, UseGuards, Get, Query } from "@nestjs/common";
import { GoalService } from "./goal.service";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { AuthenticationGuard } from "src/shared/guards/authentication.guard";
import { User } from "../user/user.entity";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { IResponse } from "src/shared/interfaces/response.interface";
import { ParamIdDto } from "src/shared/dtos/paramId.dto";
import { OptionalAuthGuard } from "src/shared/guards/optionalAuthentication.guard";
import { GetAllDto } from "./dto/get-all.dto";
import { GetGoalStatsDto } from "./dto/get-goal-stats.dto";
import { GetYearlyStatsDto } from "./dto/get-yearly-stats.dto";

@Controller("goal")
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  @UseGuards(AuthenticationGuard)
  async create(@Body() createGoalDto: CreateGoalDto, @CurrentUser() user: User): Promise<IResponse> {
    const goal = await this.goalService.create(createGoalDto, user);
    return {
      message: "Goal created successfully",
      details: goal,
    };
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  async findAll(@Query() queryData: GetAllDto): Promise<IResponse> {
    const goals = await this.goalService.findAll(queryData);
    return {
      message: `Goals fetched successfully`,
      details: goals,
    };
  }

  @Get("stats")
  async getGoalStats(@Query() getGoalStats: GetGoalStatsDto) {
    const stats = await this.goalService.getGoalStats(getGoalStats);
    return {
      message: "Goal stats fetched successfully",
      details: stats,
    };
  }

  @Get("yearly-target")
  async getYearlyTarget(@Query() getYearlyStatsDto: GetYearlyStatsDto): Promise<IResponse> {
    const yearlyTarget = await this.goalService.getYearlyTarget(getYearlyStatsDto);
    return {
      message: "Target achievements fetched successfully",
      details: yearlyTarget,
    };
  }

  @Patch(":id")
  @UseGuards(AuthenticationGuard)
  async update(@Body() updateGoalDto: UpdateGoalDto, @Param() paramData: ParamIdDto): Promise<IResponse> {
    const updatedGoal = await this.goalService.update(paramData.id, updateGoalDto);
    return {
      message: "Goal updated successfully",
      details: updatedGoal,
    };
  }
}
