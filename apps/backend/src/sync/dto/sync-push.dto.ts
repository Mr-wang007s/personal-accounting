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

// 备份账本 DTO
export class BackupLedgerDto {
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

  @ApiProperty()
  @IsDateString()
  createdAt: string
}

// 批量备份账本请求
export class BackupLedgersDto {
  @ApiProperty({ description: '要备份的账本列表', type: [BackupLedgerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BackupLedgerDto)
  ledgers: BackupLedgerDto[]
}

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

  @ApiProperty({ description: '账本 ID' })
  @IsString()
  ledgerId: string
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

// 删除云端账本请求
export class DeleteCloudLedgerDto {
  @ApiProperty({ description: '要删除的账本客户端 ID' })
  @IsString()
  clientId: string
}
