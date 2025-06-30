import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertLifeStages1722872435439 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          INSERT INTO public."life_stage" ("label")
          VALUES 
            ('Infancy'),
            ('Toddler'),
            ('Preschool'),
            ('Childhood'),
            ('Adolescence'),
            ('Young Adult'),
            ('Adult'),
            ('Middle Age'),
            ('Senior'),
            ('Elderly');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          DELETE FROM public."life_stage"
          WHERE "name" IN 
            ('Infancy',
            'Toddler',
            'Preschool',
            'Childhood',
            'Adolescence',
            'Young Adult',
            'Adult',
            'Middle Age',
            'Senior',
            'Elderly');
        `);
  }
}
