import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateEpisodeResponseDto {
  @IsUUID()
  @IsNotEmpty()
  readonly id: string;

  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @IsString()
  @IsNotEmpty()
  readonly videoUrl: string;

  @IsNotEmpty()
  @IsNotEmpty()
  readonly sizeInKb: number;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  readonly duration: number | null;
}
