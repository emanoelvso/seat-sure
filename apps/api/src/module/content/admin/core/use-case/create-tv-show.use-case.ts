import { Injectable } from '@nestjs/common';
import { TvShowContentModel } from '../model/tv-show-content.model';
import { ContentRepository } from '@contentModule/admin/persistence/repository/content.repository';
import { TvShow } from '@contentModule/shared/persistence/entity/tv-show.entity';
import { Thumbnail } from '@contentModule/shared/persistence/entity/thumbnail.entity';

@Injectable()
export class CreateTvShowUseCase {
  constructor(private readonly contentRepository: ContentRepository) {}

  async execute(tvShow: {
    // TODO: add userId
    title: string;
    description: string;
    thumbnailUrl?: string;
  }): Promise<TvShowContentModel> {
    const content = new TvShowContentModel({
      title: tvShow.title,
      description: tvShow.description,
      tvShow: new TvShow({}),
    });

    if (tvShow.thumbnailUrl && content.tvShow) {
      content.tvShow.thumbnail = new Thumbnail({
        url: tvShow.thumbnailUrl,
      });
    }

    return await this.contentRepository.saveTvShow(content);
  }
}
