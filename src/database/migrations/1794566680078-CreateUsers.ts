import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1794566680078 implements MigrationInterface {
  name = 'CreateUsers1794566680078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(254) NOT NULL, "username" character varying(30) NOT NULL, "name" character varying(100) NOT NULL, "password_hash" character varying NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'user', "email_verified_at" TIMESTAMP WITH TIME ZONE, "token_version" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_users_role" CHECK ("role" IN ('user', 'admin')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_username" ON "users"  ("username") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email" ON "users"  ("email") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_users_email"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_username"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
