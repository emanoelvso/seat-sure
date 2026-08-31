import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEpisodeRequestDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  readonly description: string;

  @IsNotEmpty()
  readonly season: number;

  @IsNotEmpty()
  readonly number: number;
}
