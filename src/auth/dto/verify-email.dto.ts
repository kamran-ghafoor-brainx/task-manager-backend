import { IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'token must be a 64-character hex string',
  })
  token!: string;
}
