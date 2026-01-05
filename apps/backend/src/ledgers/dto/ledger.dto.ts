import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsDateString } from 'class-validator'

// 创建账本 DTO
export class CreateLedgerDto {
  @ApiProperty({ description: '客户端 ID（本地唯一标识）' })
  @IsString()
  clientId: string

  @ApiProperty({ description: '账本名称' })
  @IsString()
  name: string

  @ApiPropertyOptional({ description: '图标' })
  @IsString()
  @IsOptional()
  icon?: string

  @ApiPropertyOptional({ description: '颜色' })
  @IsString()
  @IsOptional()
  color?: string

  @ApiPropertyOptional({ description: '创建时间' })
  @IsDateString()
  @IsOptional()
  createdAt?: string
}

// 更新账本 DTO
export class UpdateLedgerDto {
  @ApiPropertyOptional({ description: '账本名称' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ description: '图标' })
  @IsString()
  @IsOptional()
  icon?: string

  @ApiPropertyOptional({ description: '颜色' })
  @IsString()
  @IsOptional()
  color?: string
}
