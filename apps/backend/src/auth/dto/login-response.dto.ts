import { ApiProperty } from '@nestjs/swagger'

export class UserDto {
  @ApiProperty({ description: '用户 ID' })
  id: string

  @ApiProperty({ description: '手机号' })
  phone: string

  @ApiProperty({ description: '微信 openid', required: false })
  openid?: string

  @ApiProperty({ description: '昵称', required: false })
  nickname?: string

  @ApiProperty({ description: '头像', required: false })
  avatar?: string
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Token' })
  accessToken: string

  @ApiProperty({ description: '用户信息', type: UserDto })
  user: UserDto

  @ApiProperty({ description: '是否为新用户' })
  isNewUser: boolean
}
