import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional } from 'class-validator'

export class WxCloudLoginDto {
  @ApiPropertyOptional({ description: '用户昵称' })
  @IsString()
  @IsOptional()
  nickname?: string

  @ApiPropertyOptional({ description: '用户头像 URL' })
  @IsString()
  @IsOptional()
  avatar?: string
}
