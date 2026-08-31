import { ContentType } from '@contentModule/shared/core/enum/conten-type.enum';
import { Movie } from '@contentModule/shared/persistence/entity/movie.entity';
import { WithOptional } from '@sharedLibs/core/model/default.model';
import { randomUUID } from 'crypto';

export class MovieContentModel {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  ageRecommendation: number | null;
  movie: Movie;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(
    data: Omit<
      WithOptional<
        MovieContentModel,
        'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
      >,
      'type'
    >,
  ) {
    Object.assign(this, {
      ...data,
      id: data.id ?? randomUUID(),
      createdAt: data.createdAt ?? Date.now(),
      updatedAt: data.updatedAt ?? Date.now(),
      deletedAt: data.deletedAt,
      type: ContentType.MOVIE,
      movie: data.movie,
    });
  }
}
