import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeEventCapacityOptional1760000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Capacity becomes optional to support unlimited events.
    await queryRunner.query(
      'ALTER TABLE "events" ALTER COLUMN "capacity" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "events" ALTER COLUMN "capacity" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Backfill NULL values before restoring NOT NULL constraint.
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
