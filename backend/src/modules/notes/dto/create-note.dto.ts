import { IsString, IsNotEmpty, IsUUID, IsOptional, IsIn } from 'class-validator';

export class CreateNoteDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  folder_id!: string;

  @IsString()
  @IsOptional()
  @IsIn(['student', 'educator'])
  type?: 'student' | 'educator'; // Note type field for educator mode
}