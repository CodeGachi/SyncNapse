import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PublicAccess } from '@prisma/client';

export class UpdatePublicAccessDto {
  @ApiProperty({ enum: PublicAccess })
  @IsEnum(PublicAccess)
  publicAccess!: PublicAccess;
}

