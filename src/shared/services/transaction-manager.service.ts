import { Injectable } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";

@Injectable()
export class TransactionManagerService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute a given operation within a transaction.
   * @param operation - The operation to execute within a transaction.
   */
  async executeInTransaction<T>(operation: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error; // Ensure proper error handling (could add custom logging here)
    } finally {
      await queryRunner.release();
    }
  }
}
