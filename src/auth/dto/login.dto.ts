import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { toLowerTrim } from '../../common/validation/transforms';

export class LoginDto {
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  @MaxLength(72)
  password!: string;
}
