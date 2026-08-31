import { Inject, Injectable } from '@nestjs/common';
import {
  AgeRecommendationSchema,
  VideoAgeRecommendationAdapter,
} from '../adapter/video-recommendation.adapter.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Video } from '@contentModule/shared/persistence/entity/video.entity';
import { VideoMetadata } from '@contentModule/shared/persistence/entity/video-metadata.entity';
import { runInTransaction } from 'typeorm-transactional';
import { ContentAgeRecommendationQueueProducer } from '@contentModule/video-processor/queue/producer/content-age-recommendation.queue-producer';
import { VideoMetadataRepository } from '@contentModule/video-processor/persistence/repository/video-metadata.repository';

@Injectable()
export class SetAgeRecommendationUseCase {
  constructor(
    @Inject(VideoAgeRecommendationAdapter)
    private readonly videoAgeRecommendationAdapter: VideoAgeRecommendationAdapter,
    private readonly videoMetadataRepository: VideoMetadataRepository,
    private readonly contentAgeRecommendationQueueProducer: ContentAgeRecommendationQueueProducer,
    private readonly logger: AppLogger,
  ) {}

  async execute(video: Video): Promise<void> {
    const ageRecommendation =
      await this.videoAgeRecommendationAdapter.getAgeRecommendation(video.url);

    if (!ageRecommendation) {
      throw new Error(
        `Failed to generate age recommendation for video with ID: ${video.id}`,
      );
    }

    this.logger.log(`Generated age recommendation for video ID: ${video.id}`, {
      ageRecommendation,
      videoId: video.id,
    });

    const metadata = await this.getAndPopulateMetadata(
      video,
      ageRecommendation,
    );

    await runInTransaction(
      async () => {
        await this.videoMetadataRepository.save(metadata);
        await this.contentAgeRecommendationQueueProducer.processContentAgeRecommendation(
          metadata,
        );
      },
      { connectionName: 'content' },
    );
  }

  private async getAndPopulateMetadata(
    video: Video,
    ageRecommendation: AgeRecommendationSchema,
  ) {
    const metadata = await this.videoMetadataRepository.findOne({
      where: { video },
    });

    if (metadata) {
      metadata.ageRating = ageRecommendation.ageRating;
      metadata.ageRatingCategories = ageRecommendation.categories;
      metadata.ageRatingExplanation = ageRecommendation.explanation;

      return metadata;
    }

    return new VideoMetadata({
      ageRating: ageRecommendation.ageRating,
      ageRatingCategories: ageRecommendation.categories,
      ageRatingExplanation: ageRecommendation.explanation,
      video,
    });
  }
}
