import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotePermission } from '@prisma/client';

export class UpdateCollaboratorDto {
  @ApiProperty({ enum: NotePermission })
  @IsEnum(NotePermission)
  permission!: NotePermission;
}

