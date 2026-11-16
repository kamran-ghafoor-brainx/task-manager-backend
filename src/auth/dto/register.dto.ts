import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { toLowerTrim, trim } from '../../common/validation/transforms';

export class RegisterDto {
  @Transform(trim)
  @IsString({ message: 'name is required' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100)
  name!: string;

  @Transform(toLowerTrim)
  @IsString()
  @Matches(/^[a-z0-9_]{3,30}$/, {
    message:
      'username must be 3–30 characters: letters, numbers and underscores only',
  })
  username!: string;

  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(72, { message: 'password must be at most 72 characters' })
  password!: string;
}
