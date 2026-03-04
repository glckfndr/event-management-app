import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventVisibility1760000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"events_visibility_enum\" AS ENUM('public', 'private')",
    );

    await queryRunner.query(
      'ALTER TABLE "events" ADD "visibility" "events_visibility_enum" NOT NULL DEFAULT \'public\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "events" DROP COLUMN "visibility"');
    await queryRunner.query('DROP TYPE "events_visibility_enum"');
  }
}
