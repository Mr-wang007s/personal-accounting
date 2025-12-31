import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator'

export class UpdateRecordDto {
  @ApiPropertyOptional({ enum: ['income', 'expense'], description: '记录类型' })
  @IsEnum(['income', 'expense'])
  @IsOptional()
  type?: 'income' | 'expense'

  @ApiPropertyOptional({ description: '金额', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: '日期 (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  date?: string

  @ApiPropertyOptional({ description: '备注', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string
}
