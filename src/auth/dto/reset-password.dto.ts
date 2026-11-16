import { PickType } from '@nestjs/mapped-types';
import { IsString, Matches } from 'class-validator';
import { RegisterDto } from './register.dto';

export class ResetPasswordDto extends PickType(RegisterDto, [
  'password',
] as const) {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'token must be a 64-character hex string',
  })
  token!: string;
}
