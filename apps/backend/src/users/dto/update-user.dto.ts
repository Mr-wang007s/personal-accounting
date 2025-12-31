import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, MaxLength } from 'class-validator'

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '用户昵称', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickname?: string

  @ApiPropertyOptional({ description: '用户头像 URL' })
  @IsString()
  @IsOptional()
  avatar?: string
}
