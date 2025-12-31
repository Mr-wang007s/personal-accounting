import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class DevLoginDto {
  @ApiProperty({ description: '用户唯一标识（openid 或自定义 ID）' })
  @IsString()
  @IsNotEmpty()
  openid: string

  @ApiPropertyOptional({ description: '用户昵称' })
  @IsString()
  @IsOptional()
  nickname?: string
}
