import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { toLowerTrim } from '../../common/validation/transforms';
import { IsOptionalNonNull } from '../../common/validators/is-optional-non-null.validator';

export class CreateInvitationDto {
  @IsOptionalNonNull()
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email?: string;

  @IsOptionalNonNull()
  @Transform(toLowerTrim)
  @IsString()
  @Matches(/^[a-z0-9_]{3,30}$/, {
    message:
      'username must be 3 to 30 characters: letters, numbers and underscores only',
  })
  username?: string;
}
