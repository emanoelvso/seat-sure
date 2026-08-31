import { Module } from '@nestjs/common';
import { VideoAgeRecommendationAdapter } from './core/adapter/video-recommendation.adapter.interface';
import { GeminiTextExtractor } from './http/client/gemini/gemini-text-extractor.client';
import { VideoSummaryGenerationAdapter } from './core/adapter/video-summary-generator.adapter.interface';
import { VideoTranscriptGenerationAdapter } from './core/adapter/video-transcript-generator.adapter.interface';
import { TranscribeVideoUseCase } from './core/use-case/transcribe-video.use-case';
import { GenerateSummaryUseCase } from './core/use-case/generate-summary-for-video.use-case';
import { SetAgeRecommendationUseCase } from './core/use-case/set-age-recommendation.use-case';
import { VideoMetadataRepository } from './persistence/repository/video-metadata.repository';
import { VideoSummaryConsumer } from './queue/consumer/video-summary.queue-consumer';
import { VideoTranscriptConsumer } from './queue/consumer/video-transcription.queue-consumer';
import { VideoAgeReccomendationConsumer } from './queue/consumer/video-age-recommendation.queue-consumer';
import { ContentAgeRecommendationQueueProducer } from './queue/producer/content-age-recommendation.queue-producer';
import { ContentSharedModule } from '@contentModule/shared/content-shared.module';
import { HttpClientModule } from '@sharedModules/http-client/http-client.module';
import { LoggerModule } from '@sharedModules/logger/logger.module';
import { ConfigModule } from '@sharedModules/config/config.module';

@Module({
  imports: [
    ContentSharedModule,
    HttpClientModule,
    LoggerModule,
    ConfigModule.forRoot(),
  ],
  providers: [
    {
      provide: VideoAgeRecommendationAdapter,
      useClass: GeminiTextExtractor,
    },
    {
      provide: VideoSummaryGenerationAdapter,
      useClass: GeminiTextExtractor,
    },
    {
      provide: VideoTranscriptGenerationAdapter,
      useClass: GeminiTextExtractor,
    },
    TranscribeVideoUseCase,
    GenerateSummaryUseCase,
    SetAgeRecommendationUseCase,
    VideoMetadataRepository,
    VideoSummaryConsumer,
    VideoTranscriptConsumer,
    VideoAgeReccomendationConsumer,
    ContentAgeRecommendationQueueProducer,
  ],
})
export class ContentVideoProcessorModule {}

