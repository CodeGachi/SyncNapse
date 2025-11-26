import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateFileDto } from './create-file.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateFileDto extends PartialType(CreateFileDto) {
  @ApiProperty({ description: 'Set as latest version', required: false })
  @IsOptional()
  @IsBoolean()
  isLatest?: boolean;

  @ApiProperty({ description: 'Previous version ID', required: false })
  @IsOptional()
  @IsString()
  previousVersionId?: string;
}

