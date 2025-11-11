import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

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
}