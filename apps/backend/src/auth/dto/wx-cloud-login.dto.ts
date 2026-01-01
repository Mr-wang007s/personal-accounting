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

  @ApiPropertyOptional({ description: '微信登录 code（可选，用于标准登录流程）' })
  @IsString()
  @IsOptional()
  code?: string
}
