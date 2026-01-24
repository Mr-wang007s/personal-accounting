import { IsString, IsOptional } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @IsOptional()
  nickname?: string

  @IsString()
  @IsOptional()
  avatar?: string
}
