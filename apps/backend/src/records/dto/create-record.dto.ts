import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator'

export class CreateRecordDto {
  @ApiProperty({ enum: ['income', 'expense'], description: '记录类型' })
  @IsEnum(['income', 'expense'])
  type: 'income' | 'expense'

  @ApiProperty({ description: '金额', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number

  @ApiProperty({ description: '分类 ID' })
  @IsString()
  @IsNotEmpty()
  category: string

  @ApiProperty({ description: '日期 (YYYY-MM-DD)' })
  @IsDateString()
  date: string

  @ApiPropertyOptional({ description: '备注', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string

  @ApiPropertyOptional({ description: '客户端 ID（用于同步）' })
  @IsString()
  @IsOptional()
  clientId?: string
}
