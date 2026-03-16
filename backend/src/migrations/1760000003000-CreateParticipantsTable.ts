import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateParticipantsTable1760000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.createTable(
      new Table({
        name: 'participants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'eventId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'joinedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['eventId'],
        referencedTableName: 'events',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'participants',
      new TableUnique({
        name: 'UQ_participants_user_event',
        // Prevent the same user from joining the same event twice.
        columnNames: ['userId', 'eventId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('participants');

    if (table) {
      const userForeignKey = table.foreignKeys.find((foreignKey) =>
        foreignKey.columnNames.includes('userId'),
      );
      const eventForeignKey = table.foreignKeys.find((foreignKey) =>
        foreignKey.columnNames.includes('eventId'),
      );
      const uniqueConstraint = table.uniques.find(
        (unique) => unique.name === 'UQ_participants_user_event',
      );

      if (uniqueConstraint) {
        // Drop unique constraint before table removal for predictable rollback.
        await queryRunner.dropUniqueConstraint(
          'participants',
          uniqueConstraint,
        );
      }

      if (userForeignKey) {
        await queryRunner.dropForeignKey('participants', userForeignKey);
      }

      if (eventForeignKey) {
        await queryRunner.dropForeignKey('participants', eventForeignKey);
      }
    }

    await queryRunner.dropTable('participants');
  }
}
