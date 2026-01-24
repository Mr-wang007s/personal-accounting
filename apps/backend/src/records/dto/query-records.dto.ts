import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryRecordsDto {
  @ApiPropertyOptional({ description: '账本 ID' })
  @IsString()
  @IsOptional()
  ledgerId?: string

  @ApiPropertyOptional({ enum: ['income', 'expense'], description: '记录类型' })
  @IsEnum(['income', 'expense'])
  @IsOptional()
  type?: 'income' | 'expense'

  @ApiPropertyOptional({ description: '分类' })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: '开始日期' })
  @IsDateString()
  @IsOptional()
  startDate?: string

  @ApiPropertyOptional({ description: '结束日期' })
  @IsDateString()
  @IsOptional()
  endDate?: string
}
