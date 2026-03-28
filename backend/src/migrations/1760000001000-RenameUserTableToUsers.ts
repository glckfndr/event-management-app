import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserTableToUsers1760000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUserTable = await queryRunner.hasTable('user');
    const hasUsersTable = await queryRunner.hasTable('users');

    // Safe rename supports projects that already use the new table name.
    if (hasUserTable && !hasUsersTable) {
      await queryRunner.renameTable('user', 'users');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUserTable = await queryRunner.hasTable('user');
    const hasUsersTable = await queryRunner.hasTable('users');

    if (!hasUserTable && hasUsersTable) {
      await queryRunner.renameTable('users', 'user');
    }
  }
}
