import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCollaboration1794814520193 implements MigrationInterface {
  name = 'CreateCollaboration1794814520193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "task_collaborators" ("task_id" integer NOT NULL, "user_id" integer NOT NULL, "added_by_id" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_615454d646ac02305613547bd65" PRIMARY KEY ("task_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_collaborators_user_id" ON "task_collaborators"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "task_invitations" ("id" SERIAL NOT NULL, "task_id" integer NOT NULL, "inviter_id" integer NOT NULL, "invitee_email" character varying(254) NOT NULL, "invitee_user_id" integer, "status" character varying(20) NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "responded_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_task_invitations_status" CHECK ("status" IN ('pending', 'accepted', 'declined', 'revoked', 'expired')), CONSTRAINT "PK_0261ca729520f593e859c203ab1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_task_invitations_pending" ON "task_invitations"  ("task_id", "invitee_email") WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_collaborators" ADD CONSTRAINT "FK_68e52283efc02d6d3b3c17e03e9" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_collaborators" ADD CONSTRAINT "FK_39141e8fc84d6064cf4bfd0f93a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_collaborators" ADD CONSTRAINT "FK_c5c5902b2b5265faee024113677" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_invitations" ADD CONSTRAINT "FK_728f57a2d4e199bf549093c3a7b" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_invitations" ADD CONSTRAINT "FK_2672f6cbe0ca89238aa15b556b2" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_invitations" ADD CONSTRAINT "FK_22805fae41994b6de7e948435a7" FOREIGN KEY ("invitee_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_invitations" DROP CONSTRAINT "FK_22805fae41994b6de7e948435a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_invitations" DROP CONSTRAINT "FK_2672f6cbe0ca89238aa15b556b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_invitations" DROP CONSTRAINT "FK_728f57a2d4e199bf549093c3a7b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_collaborators" DROP CONSTRAINT "FK_c5c5902b2b5265faee024113677"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_collaborators" DROP CONSTRAINT "FK_39141e8fc84d6064cf4bfd0f93a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_collaborators" DROP CONSTRAINT "FK_68e52283efc02d6d3b3c17e03e9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_task_invitations_pending"`,
    );
    await queryRunner.query(`DROP TABLE "task_invitations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_task_collaborators_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "task_collaborators"`);
  }
}
