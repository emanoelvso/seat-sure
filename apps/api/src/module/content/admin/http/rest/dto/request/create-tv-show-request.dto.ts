import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTvShowRequestDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @IsString()
  @IsOptional()
  readonly thumbnailUrl: string;
}
