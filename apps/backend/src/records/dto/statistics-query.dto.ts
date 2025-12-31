import { ApiProperty } from '@nestjs/swagger'
import { IsDateString } from 'class-validator'

export class StatisticsQueryDto {
  @ApiProperty({ description: '开始日期 (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string

  @ApiProperty({ description: '结束日期 (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string
}
