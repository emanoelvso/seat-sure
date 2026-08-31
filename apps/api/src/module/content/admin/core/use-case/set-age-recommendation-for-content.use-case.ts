import { ContentRepository } from '@contentModule/admin/persistence/repository/content.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentAgeRecommendationService } from '../service/content-age-recommendation.service';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';

@Injectable()
export class setAgeRecommendationForContentUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly contentAgeRecommendationService: ContentAgeRecommendationService,
    private readonly logger: AppLogger,
  ) {}

  async execute(videoId: string, ageRecommendation: number) {
    const content = await this.contentRepository.findContentByVideoId(videoId);
    if (!content) {
      return new NotFoundException(
        `Content with video ID ${videoId} not found`,
      );
    }

    this.contentAgeRecommendationService.setAgeRecommendationForContent(
      content,
      ageRecommendation,
    );

    await this.contentRepository.saveMovieOrThvShow(content);

    this.logger.log(
      `Set age recommendation for content with video ID ${videoId} to ${ageRecommendation}`,
    );
  }
}
