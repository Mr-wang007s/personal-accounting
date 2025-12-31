import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class WechatLoginDto {
  @ApiProperty({ description: '微信登录 code' })
  @IsString()
  @IsNotEmpty()
  code: string

  @ApiPropertyOptional({ description: '用户昵称' })
  @IsString()
  @IsOptional()
  nickname?: string

  @ApiPropertyOptional({ description: '用户头像 URL' })
  @IsString()
  @IsOptional()
  avatar?: string
}
