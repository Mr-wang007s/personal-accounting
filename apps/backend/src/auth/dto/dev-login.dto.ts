import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty } from 'class-validator'

export class DevLoginDto {
  @ApiProperty({ description: '模拟的 openid' })
  @IsString()
  @IsNotEmpty()
  openid: string
}
