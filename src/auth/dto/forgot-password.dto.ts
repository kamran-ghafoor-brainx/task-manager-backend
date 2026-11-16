import { PickType } from '@nestjs/mapped-types';
import { RegisterDto } from './register.dto';

export class ForgotPasswordDto extends PickType(RegisterDto, [
  'email',
] as const) {}
