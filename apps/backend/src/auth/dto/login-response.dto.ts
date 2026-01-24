import { ApiProperty } from '@nestjs/swagger'
import { AuthUser, AuthType } from '@personal-accounting/shared'

export class BoundAuthDto {
  @ApiProperty({ description: '认证类型' })
  authType: AuthType

  @ApiProperty({ description: '标识（已脱敏）' })
  identifier: string

  @ApiProperty({ description: '是否已验证' })
  verified: boolean
}

export class AuthUserDto implements AuthUser {
  @ApiProperty({ description: '用户 ID' })
  id: string

  @ApiProperty({ description: '昵称', required: false })
  nickname?: string

  @ApiProperty({ description: '头像', required: false })
  avatar?: string

  @ApiProperty({ description: '用户状态' })
  status: 'active' | 'inactive' | 'banned'

  @ApiProperty({ description: '当前登录方式' })
  authType: AuthType

  @ApiProperty({ description: '当前登录标识' })
  identifier: string

  @ApiProperty({ description: '已绑定的登录方式', type: [BoundAuthDto] })
  boundAuths: BoundAuthDto[]
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Token' })
  accessToken: string

  @ApiProperty({ description: '用户信息', type: AuthUserDto })
  user: AuthUser

  @ApiProperty({ description: '是否为新用户' })
  isNewUser: boolean
}
