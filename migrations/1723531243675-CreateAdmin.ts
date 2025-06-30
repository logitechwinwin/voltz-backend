import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";

export class CreateAdmin1723531243675 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash("123123", 10);

    await queryRunner.query(`
                INSERT INTO public."user" ("email", "firstName", "lastName", "password", "phoneNumber","_v","role")
                VALUES (
                    'admin@voltz.com',
                    'John',
                    'Bravo',
                    '${hashedPassword}',
                    '+18143008378',
                    1,
                    'admin'
                );
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM public."user" WHERE "email" = 'admin@voltz.com';
        `);
  }
}
