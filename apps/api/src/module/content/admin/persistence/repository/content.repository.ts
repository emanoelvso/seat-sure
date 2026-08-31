import { MovieContentModel } from '@contentModule/admin/core/model/movie-content.model';
import { Content } from '../../../shared/persistence/entity/content.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource, FindOptionsRelations } from 'typeorm';
import { TvShowContentModel } from '@contentModule/admin/core/model/tv-show-content.model';
import { InjectDataSource } from '@nestjs/typeorm';
import { ContentType } from '@contentModule/shared/core/enum/conten-type.enum';

export class ContentRepository extends DefaultTypeOrmRepository<Content> {
  constructor(@InjectDataSource('content') readonly dataSource: DataSource) {
    super(Content, dataSource.manager);
  }

  async saveMovieOrThvShow(
    entity: MovieContentModel | TvShowContentModel,
  ): Promise<MovieContentModel | TvShowContentModel> {
    if (entity.type === ContentType.MOVIE) {
      return this.saveMovie(entity as MovieContentModel);
    }

    if (entity.type === ContentType.TV_SHOW) {
      return this.saveTvShow(entity as TvShowContentModel);
    }

    throw new Error(`Content type ${entity.type} not found`);
  }

  async saveMovie(entity: MovieContentModel): Promise<MovieContentModel> {
    const content = new Content({
      id: entity.id,
      type: entity.type,
      title: entity.title,
      description: entity.description,
      ageRecommendation: entity.ageRecommendation,
      movie: entity.movie,
    });

    await super.save(content);

    return this.mapToMovieContentModel(content);
  }

  async saveTvShow(entity: TvShowContentModel): Promise<TvShowContentModel> {
    const content = new Content({
      id: entity.id,
      type: entity.type,
      title: entity.title,
      description: entity.description,
      tvShow: entity.tvShow,
    });

    await super.save(content);

    return new TvShowContentModel({
      id: content.id,
      title: content.title,
      description: content.description,
      ageRecommendation: content.ageRecommendation,
      tvShow: content.tvShow!,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      deletedAt: content.deletedAt,
    });
  }

  async findTvShowContentById(
    id: string,
    relations?: FindOptionsRelations<Content>,
  ): Promise<TvShowContentModel | null> {
    const content = await super.findOneById(id, relations);

    if (!content || !content.tvShow) {
      return null;
    }

    return this.mapToTvShowContentModel(content);
  }

  async findContentByVideoId(
    videoId: string,
  ): Promise<MovieContentModel | TvShowContentModel | null> {
    const content = await this.entityManager
      .createQueryBuilder(Content, 'content')
      .leftJoinAndSelect('content.movie', 'movie')
      .leftJoinAndSelect('movie.video', 'movieVideo')
      .leftJoinAndSelect('content.tvShow', 'tvShow')
      .leftJoinAndSelect('tvShow.episode', 'episode')
      .leftJoinAndSelect('episode.video', 'episodeVideo')
      .where('movieVideo.id = :videoId OR episodeVideo.id = :videoId', {
        videoId,
      })
      .getOne();

    if (!content || (!content.movie && !content.tvShow)) {
      return null;
    }

    if (content.tvShow) {
      return this.mapToTvShowContentModel(content);
    }

    if (content.movie) {
      return this.mapToMovieContentModel(content);
    }
    return null;
  }

  private mapToMovieContentModel(content: Content): MovieContentModel {
    return new MovieContentModel({
      id: content.id,
      title: content.title,
      description: content.description,
      ageRecommendation: content.ageRecommendation,
      movie: content.movie!,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      deletedAt: content.deletedAt,
    });
  }

  private mapToTvShowContentModel(content: Content): TvShowContentModel {
    return new TvShowContentModel({
      id: content.id,
      title: content.title,
      description: content.description,
      ageRecommendation: content.ageRecommendation,
      tvShow: content.tvShow!,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      deletedAt: content.deletedAt,
    });
  }
}
