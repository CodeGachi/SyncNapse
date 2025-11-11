import { IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateFolderDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  parent_id?: string | null;
}

