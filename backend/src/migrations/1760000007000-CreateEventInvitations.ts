import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventInvitations1760000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"event_invitations_status_enum\" AS ENUM('pending', 'accepted', 'declined')",
    );

    await queryRunner.query(`
      CREATE TABLE "event_invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "invitedByUserId" uuid NOT NULL,
        "invitedUserId" uuid NOT NULL,
        "status" "event_invitations_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_invitations_event_user" UNIQUE ("eventId", "invitedUserId"),
        CONSTRAINT "FK_event_invitations_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_event_invitations_invited_by_user" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_event_invitations_invited_user" FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_event_invitations_event_id" ON "event_invitations" ("eventId")',
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_event_invitations_invited_user_id" ON "event_invitations" ("invitedUserId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_event_invitations_invited_user_id"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_event_invitations_event_id"',
    );
    await queryRunner.query('DROP TABLE "event_invitations"');
    await queryRunner.query('DROP TYPE "event_invitations_status_enum"');
  }
}
