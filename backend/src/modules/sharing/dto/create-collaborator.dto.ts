import { IsEnum, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotePermission } from '@prisma/client';

export class CreateCollaboratorDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: NotePermission, default: NotePermission.VIEWER })
  @IsEnum(NotePermission)
  permission: NotePermission = NotePermission.VIEWER;
}

