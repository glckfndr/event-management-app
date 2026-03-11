import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTagsAndEventTags1760000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        CONSTRAINT "PK_tags_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_tags_name_ci_unique" ON "tags" (LOWER("name"))',
    );

    await queryRunner.query(`
      CREATE TABLE "event_tags" (
        "eventId" uuid NOT NULL,
        "tagId" uuid NOT NULL,
        CONSTRAINT "PK_event_tags" PRIMARY KEY ("eventId", "tagId"),
        CONSTRAINT "FK_event_tags_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_event_tags_tag" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_event_tags_event_id" ON "event_tags" ("eventId")',
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_event_tags_tag_id" ON "event_tags" ("tagId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_event_tags_tag_id"');
    await queryRunner.query('DROP INDEX "public"."IDX_event_tags_event_id"');
    await queryRunner.query('DROP TABLE "event_tags"');
    await queryRunner.query('DROP INDEX "public"."IDX_tags_name_ci_unique"');
    await queryRunner.query('DROP TABLE "tags"');
  }
}
