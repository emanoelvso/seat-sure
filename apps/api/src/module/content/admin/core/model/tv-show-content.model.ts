import { ContentType } from '@contentModule/shared/core/enum/conten-type.enum';
import { TvShow } from '@contentModule/shared/persistence/entity/tv-show.entity';
import { WithOptional } from '@sharedLibs/core/model/default.model';
import { randomUUID } from 'crypto';

export class TvShowContentModel {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  ageRecommendation?: number | null;
  tvShow: TvShow;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(
    data: Omit<
      WithOptional<
        TvShowContentModel,
        'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
      >,
      'type'
    >,
  ) {
    Object.assign(this, {
      ...data,
      id: data.id ?? randomUUID(),
      type: ContentType.TV_SHOW,
      tvShow: data.tvShow,
      createdAt: data.createdAt ?? Date.now(),
      updatedAt: data.updatedAt ?? Date.now(),
      deletedAt: data.deletedAt,
    });
  }
}
