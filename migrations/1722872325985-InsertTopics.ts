import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertTopics1722872325985 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          INSERT INTO public."topic" ("label")
          VALUES 
            ('Hello World'),
            ('Technology'),
            ('Education'),
            ('Health & Wellness'),
            ('Environment'),
            ('Social Issues'),
            ('Art & Culture'),
            ('Science'),
            ('Sports'),
            ('Travel & Tourism');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          DELETE FROM public."topic"
          WHERE "label" IN 
            ('Hello World',
            'Technology',
            'Education',
            'Health & Wellness',
            'Environment',
            'Social Issues',
            'Art & Culture',
            'Science',
            'Sports',
            'Travel & Tourism');
        `);
  }
}
