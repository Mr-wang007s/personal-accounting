import { ApiProperty } from '@nestjs/swagger'

class UserInfo {
  @ApiProperty()
  id: string

  @ApiProperty()
  openid: string

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
}
