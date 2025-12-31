import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsDateString,
  Min,
} from 'class-validator'

export class SyncRecordDto {
  @ApiPropertyOptional({ description: '服务端 ID（更新时必填）' })
  @IsString()
  @IsOptional()
  id?: string

  @ApiPropertyOptional({ description: '客户端 ID' })
  @IsString()
  @IsOptional()
  clientId?: string

  @ApiPropertyOptional({ enum: ['income', 'expense'] })
  @IsEnum(['income', 'expense'])
  @IsOptional()
  type?: 'income' | 'expense'

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string

  @ApiPropertyOptional({ description: '同步版本号' })
  @IsNumber()
  @IsOptional()
  syncVersion?: number
}

export class SyncPushDto {
  @ApiPropertyOptional({ description: '新建的记录', type: [SyncRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncRecordDto)
  @IsOptional()
  created?: SyncRecordDto[]

  @ApiPropertyOptional({ description: '更新的记录', type: [SyncRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncRecordDto)
  @IsOptional()
  updated?: SyncRecordDto[]

  @ApiPropertyOptional({ description: '删除的记录 ID', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deleted?: string[]
}
