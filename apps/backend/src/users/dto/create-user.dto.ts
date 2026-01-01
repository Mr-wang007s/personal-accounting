import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  phone: string

  @IsString()
  @IsOptional()
  openid?: string

  @IsString()
  @IsOptional()
  unionid?: string

  @IsString()
  @IsOptional()
  nickname?: string

  @IsString()
  @IsOptional()
  avatar?: string

  @IsString()
  @IsOptional()
  password?: string
}
