import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateFolderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

