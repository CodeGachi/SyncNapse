import { IsString, IsNotEmpty } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  noteId!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;
}

