import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
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

// 备份记录 DTO
export class BackupRecordDto {
  @ApiProperty({ description: '客户端 ID（本地唯一标识）' })
  @IsString()
  clientId: string

  @ApiProperty({ enum: ['income', 'expense'] })
  @IsEnum(['income', 'expense'])
  type: 'income' | 'expense'

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number

  @ApiProperty()
  @IsString()
  category: string

  @ApiProperty()
  @IsDateString()
  date: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string

  @ApiProperty()
  @IsDateString()
  createdAt: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  updatedAt?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ledgerId?: string
}

// 批量备份请求
export class BackupDto {
  @ApiProperty({ description: '要备份的记录列表', type: [BackupRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BackupRecordDto)
  records: BackupRecordDto[]
}

// 删除云端记录请求
export class DeleteCloudRecordsDto {
  @ApiProperty({ description: '要删除的云端记录 ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  serverIds: string[]
}
