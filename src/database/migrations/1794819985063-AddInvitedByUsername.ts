import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitedByUsername1794819985063 implements MigrationInterface {
  name = 'AddInvitedByUsername1794819985063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_invitations" ADD "invited_by_username" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_invitations" DROP COLUMN "invited_by_username"`,
    );
  }
}
