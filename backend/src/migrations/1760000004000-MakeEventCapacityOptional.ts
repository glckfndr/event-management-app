import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeEventCapacityOptional1760000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "events" ALTER COLUMN "capacity" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "events" ALTER COLUMN "capacity" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE "events" SET "capacity" = 1 WHERE "capacity" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "events" ALTER COLUMN "capacity" SET DEFAULT 1',
    );
    await queryRunner.query(
      'ALTER TABLE "events" ALTER COLUMN "capacity" SET NOT NULL',
    );
  }
}
