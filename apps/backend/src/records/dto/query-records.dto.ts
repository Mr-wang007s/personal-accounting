import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'

export class QueryRecordsDto {
  @ApiPropertyOptional({ enum: ['income', 'expense'], description: '记录类型' })
  @IsEnum(['income', 'expense'])
  @IsOptional()
  type?: 'income' | 'expense'

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: '开始日期 (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string

  @ApiPropertyOptional({ description: '结束日期 (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsString()
  @IsOptional()
  keyword?: string

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: '排序方向' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc'

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20
}
