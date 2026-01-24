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
  @IsEnum(['income', 'expense'], { message: '类型必须是 income 或 expense' })
  @IsOptional()
  type?: 'income' | 'expense'

  @ApiPropertyOptional({ description: '金额', minimum: 0.01 })
  @IsNumber({}, { message: '金额必须是数字' })
  @Min(0.01, { message: '金额必须大于 0' })
  @IsOptional()
  amount?: number

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: '日期 (YYYY-MM-DD)' })
  @IsDateString({}, { message: '日期格式无效' })
  @IsOptional()
  date?: string

  @ApiPropertyOptional({ description: '备注', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '备注最多 200 字' })
  note?: string
}
