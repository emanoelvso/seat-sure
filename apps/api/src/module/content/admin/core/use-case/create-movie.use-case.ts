import { Injectable } from '@nestjs/common';
import { ExternalMovieClient } from '@contentModule/admin/http/client/external-movie-rating/external-movie-rating.client';
import { MovieContentModel } from '../model/movie-content.model';
import { ContentRepository } from '@contentModule/admin/persistence/repository/content.repository';
import { VideoProcessorService } from '../service/video-processor.service';
import { Movie } from '@contentModule/shared/persistence/entity/movie.entity';
import { Video } from '@contentModule/shared/persistence/entity/video.entity';
import { Thumbnail } from '@contentModule/shared/persistence/entity/thumbnail.entity';

@Injectable()
export class CreateMovieUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly videoProcessorService: VideoProcessorService,
    private readonly externalMovieRatingClient: ExternalMovieClient,
  ) {}

  async execute(video: {
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl?: string;
    sizeInKb: number;
  }): Promise<MovieContentModel> {
    const externalRating = await this.externalMovieRatingClient.getRating(
      video.title,
    );

    const contentModel = new MovieContentModel({
      title: video.title,
      description: video.description,
      ageRecommendation: null,
      movie: new Movie({
        externalRating,
        video: new Video({
          url: video.videoUrl,
          sizeInKb: video.sizeInKb,
        }),
      }),
    });

    if (video.thumbnailUrl) {
      contentModel.movie.thumbnail = new Thumbnail({
        url: video.thumbnailUrl,
      });
    }

    const content = await this.contentRepository.saveMovie(contentModel);

    await this.videoProcessorService.processMetadataAndModeration(
      contentModel.movie.video,
    );

    return content;
  }
}
