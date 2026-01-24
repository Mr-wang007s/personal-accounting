import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, Length, IsOptional } from 'class-validator'

export class EmailLoginDto {
  @ApiProperty({ description: '邮箱地址', example: 'user@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string

  @ApiProperty({ description: '验证码', example: '123456' })
  @IsString()
  @Length(6, 6, { message: '验证码为6位数字' })
  code: string

  @ApiPropertyOptional({ description: '昵称', example: '小明' })
  @IsString()
  @IsOptional()
  nickname?: string
}
