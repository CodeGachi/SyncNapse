import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SavePageTypingDto {
  @ApiProperty({ description: 'Typing/Ink content delta/json' })
  @IsNotEmpty()
  content: any;

  @ApiProperty({ description: 'Expected version for optimistic locking', required: false })
  @IsOptional()
  @IsNumber()
  version?: number;
}

