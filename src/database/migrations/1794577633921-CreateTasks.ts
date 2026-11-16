import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTasks1794577633921 implements MigrationInterface {
  name = 'CreateTasks1794577633921';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "owner_id" integer NOT NULL, "title" character varying(200) NOT NULL, "description" text NOT NULL DEFAULT '', "status" character varying(20) NOT NULL DEFAULT 'todo', "deadline_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_tasks_title_not_blank" CHECK (length(trim("title")) > 0), CONSTRAINT "CHK_tasks_status" CHECK ("status" IN ('todo', 'in_progress', 'done')), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_deadline_at" ON "tasks"  ("deadline_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_owner_id" ON "tasks"  ("owner_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_0631c1eb8316f8af361cf14eb85" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_0631c1eb8316f8af361cf14eb85"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tasks_deadline_at"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
  }
}
