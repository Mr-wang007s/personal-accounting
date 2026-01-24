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
  @IsEnum(['income', 'expense'], { message: '类型必须是 income 或 expense' })
  type: 'income' | 'expense'

  @ApiProperty({ description: '金额', minimum: 0.01 })
  @IsNumber({}, { message: '金额必须是数字' })
  @Min(0.01, { message: '金额必须大于 0' })
  amount: number

  @ApiProperty({ description: '分类 ID' })
  @IsString()
  @IsNotEmpty({ message: '分类不能为空' })
  category: string

  @ApiProperty({ description: '日期 (YYYY-MM-DD)' })
  @IsDateString({}, { message: '日期格式无效' })
  date: string

  @ApiPropertyOptional({ description: '备注', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: '备注最多 200 字' })
  note?: string

  @ApiPropertyOptional({ description: '客户端 ID（用于同步）' })
  @IsString()
  @IsOptional()
  clientId?: string

  @ApiProperty({ description: '账本 ID' })
  @IsString()
  @IsNotEmpty({ message: '账本 ID 不能为空' })
  ledgerId: string
}
