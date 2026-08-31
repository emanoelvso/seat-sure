import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { QUEUES } from '@contentModule/shared/queue/queue.constant';
import { VideoRepository } from '@contentModule/shared/persistence/repository/video.repository';
import { SetAgeRecommendationUseCase } from '@contentModule/video-processor/core/use-case/set-age-recommendation.use-case';

@Processor(QUEUES.VIDEO_AGE_RECOMMENDATION)
export class VideoAgeReccomendationConsumer
  extends WorkerHost
  implements OnApplicationShutdown
{
  constructor(
    private readonly setAgeReccomendationUseCase: SetAgeRecommendationUseCase,
    private readonly videoRepository: VideoRepository,
    private readonly logger: AppLogger,
  ) {
    super();
  }

  async process(
    job: Job<{ videoId: string; url: string }, void>,
  ): Promise<void> {
    this.logger.log(
      `Processing age recommendation for video ${job.data.videoId}`,
      { videoId: job.data.videoId, videoUrl: job.data.url },
    );

    const video = await this.videoRepository.findOneById(job.data.videoId);

    if (!video) {
      throw new Error(`Video with ID ${job.data.videoId} not found`);
    }

    try {
      await this.setAgeReccomendationUseCase.execute(video);
    } catch (error) {
      this.logger.error(
        `Error processing age recommendation for video ${video.id}`,
        {
          error,
          videoId: video.id,
          videoUrl: video.url,
        },
      );
      throw new Error(
        `Failed to process age recommendation for video ID: ${video.id}`,
      );
    }
  }

  // TODO: Do something with the error, log it, send a noification, put in a dead letter queue, etc.
  @OnWorkerEvent('failed')
  onFaild(job: Job, error: Error) {
    this.logger.error(`Job failed ${job.id}`, { job, error });
  }

  async onApplicationShutdown() {
    await this.worker.close(true);
  }
}
