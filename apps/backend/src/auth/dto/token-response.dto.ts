import { ApiProperty } from '@nestjs/swagger'

class UserInfo {
  @ApiProperty()
  id: string

  @ApiProperty()
  phone: string

  @ApiProperty({ required: false })
  openid?: string | null

  @ApiProperty({ required: false })
  nickname?: string | null

  @ApiProperty({ required: false })
  avatar?: string | null
}

export class TokenResponseDto {
  @ApiProperty({ description: 'JWT 访问令牌' })
  accessToken: string

  @ApiProperty({ description: '用户信息', type: UserInfo })
  user: UserInfo

  @ApiProperty({ description: '是否为新用户（首次注册）' })
  isNewUser: boolean
}
