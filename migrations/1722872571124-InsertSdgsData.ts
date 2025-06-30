import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertSdgsData1722872571124 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          INSERT INTO public."sdg" ("label", "image", "color")
          VALUES 
            ('NO POVERTY', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/no_poverty_image.png', '#e5243b'),
            ('ZERO HUNGER', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/zero_hunger_image.png', '#dda73a'),
            ('GOOD HEALTH AND WELL-BEING', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/good_health_image.png', '#4c9f38'),
            ('QUALITY EDUCATION', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/quality_education_image.png', '#c5192d'),
            ('GENDER EQUALITY', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/gender_equality_image.png', '#ff3a21'),
            ('CLEAN WATER AND SANITATION', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/clean_water_image.png', '#26bde2'),
            ('AFFORDABLE AND CLEAN ENERGY', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/clean_energy_image.png', '#fcc30b'),
            ('DECENT WORK AND ECONOMIC GROWTH', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/decent_work_image.png', '#a21942'),
            ('INDUSTRY, INNOVATION AND INFRASTRUCTURE', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/innovation_infrastructure_image.png', '#fd6925'),
            ('REDUCED INEQUALITIES', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/reduced_inequalities_image.png', '#dd1367'),
            ('SUSTAINABLE CITIES AND COMMUNITIES', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/sustainable_cities_image.png', '#fd9d24'),
            ('RESPONSIBLE CONSUMPTION AND PRODUCTION', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/responsible_consumption_image.png', '#bf8b2e'),
            ('CLIMATE ACTION', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/climate_action_image.png', '#3f7e44'),
            ('LIFE BELOW WATER', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/life_below_water_image.png', '#0a97d9'),
            ('LIFE ON LAND', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/life_on_land_image.png', '#56c02b'),
            ('PEACE, JUSTICE AND STRONG INSTITUTIONS', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/peace_justice_image.png', '#00689d'),
            ('PARTNERSHIPS FOR THE GOALS', 'https://voltzbucket1.s3.amazonaws.com/production/sdgs/images/partnerships_goals_image.png', '#19486a');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          DELETE FROM public."sdg"
          WHERE "label" IN 
            ('NO POVERTY', 'ZERO HUNGER', 'GOOD HEALTH AND WELL-BEING', 
             'QUALITY EDUCATION', 'GENDER EQUALITY', 'CLEAN WATER AND SANITATION', 
             'AFFORDABLE AND CLEAN ENERGY', 'DECENT WORK AND ECONOMIC GROWTH', 
             'INDUSTRY, INNOVATION AND INFRASTRUCTURE', 'REDUCED INEQUALITIES', 
             'SUSTAINABLE CITIES AND COMMUNITIES', 'RESPONSIBLE CONSUMPTION AND PRODUCTION', 
             'CLIMATE ACTION', 'LIFE BELOW WATER', 'LIFE ON LAND', 
             'PEACE, JUSTICE AND STRONG INSTITUTIONS', 'PARTNERSHIPS FOR THE GOALS');
        `);
  }
}
