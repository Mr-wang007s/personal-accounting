import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator'

export class PhoneLoginDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号' })
  phone: string

  @ApiPropertyOptional({ description: '用户昵称' })
  @IsString()
  @IsOptional()
  nickname?: string
}
