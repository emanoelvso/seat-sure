import { Module } from '@nestjs/common';
import { ContentAgeRecommendationService } from './core/service/content-age-recommendation.service';
import { ContentDistributionService } from './core/service/content-distribution.service';
import { EpisodeLifecycleService } from './core/service/episode-lifecycle.service';
import { VideoProcessingJobProducer } from './queue/producer/video-processing-job.queue-producer';
import { CreateMovieUseCase } from './core/use-case/create-movie.use-case';
import { CreateTvShowUseCase } from './core/use-case/create-tv-show.use-case';
import { CreateTvShowEpisodeUseCase } from './core/use-case/create-tv-show-episode.use-case';
import { setAgeRecommendationForContentUseCase } from './core/use-case/set-age-recommendation-for-content.use-case';
import { ExternalMovieClient } from './http/client/external-movie-rating/external-movie-rating.client';
import { AdminMovieController } from './http/rest/controller/admin-movie.controller';
import { AdminTvShowController } from './http/rest/controller/admin-tv-show.controller';
import { ContentRepository } from './persistence/repository/content.repository';
import { ContentSharedModule } from '@contentModule/shared/content-shared.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { ConfigModule } from '@sharedModules/config/config.module';
import { EpisodeRepository } from './persistence/repository/episode.repository';
import { VideoProcessorService } from './core/service/video-processor.service';
import { HttpClientModule } from '@sharedModules/http-client/http-client.module';

@Module({
  imports: [
    ContentSharedModule,
    LoggerModule,
    ConfigModule.forRoot(),
    HttpClientModule,
  ],
  controllers: [AdminMovieController, AdminTvShowController],
  providers: [
    ContentAgeRecommendationService,
    ContentDistributionService,
    EpisodeLifecycleService,
    VideoProcessorService,
    VideoProcessingJobProducer,
    CreateMovieUseCase,
    CreateTvShowUseCase,
    CreateTvShowEpisodeUseCase,
    setAgeRecommendationForContentUseCase,
    ExternalMovieClient,
    ContentRepository,
    EpisodeRepository,
    VideoProcessingJobProducer,
  ],
})
export class ContentAdminModule {}
