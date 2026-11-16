import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTokens1794576124232 implements MigrationInterface {
  name = 'CreateUserTokens1794576124232';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_tokens" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "purpose" character varying(30) NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_user_tokens_purpose" CHECK ("purpose" IN ('email_verification', 'password_reset')), CONSTRAINT "PK_63764db9d9aaa4af33e07b2f4bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_tokens_user_id_purpose" ON "user_tokens"  ("user_id", "purpose") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_tokens_token_hash" ON "user_tokens"  ("token_hash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_tokens" ADD CONSTRAINT "FK_9e144a67be49e5bba91195ef5de" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_tokens" DROP CONSTRAINT "FK_9e144a67be49e5bba91195ef5de"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_user_tokens_token_hash"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_tokens_user_id_purpose"`,
    );
    await queryRunner.query(`DROP TABLE "user_tokens"`);
  }
}
