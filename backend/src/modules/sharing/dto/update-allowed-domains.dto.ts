import { IsArray, IsString, ArrayUnique } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAllowedDomainsDto {
  @ApiProperty({
    description: 'List of allowed email domains',
    example: ['ajou.ac.kr', 'samsung.com'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  domains!: string[];
}

