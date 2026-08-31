import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown } from '@nestjs/common';
import { TranscribeVideoUseCase } from '@contentModule/video-processor/core/use-case/transcribe-video.use-case';
import { VideoRepository } from '@contentModule/shared/persistence/repository/video.repository';
import { QUEUES } from '@contentModule/shared/queue/queue.constant';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { Job } from 'bullmq';

@Processor(QUEUES.VIDEO_TRANSCRIPT)
export class VideoTranscriptConsumer
  extends WorkerHost
  implements OnApplicationShutdown
{
  constructor(
    private readonly transcribeVideoUseCase: TranscribeVideoUseCase,
    private readonly videoRepository: VideoRepository,
    private readonly logger: AppLogger,
  ) {
    super();
  }
  async process(job: Job<{ videoId: string; url: string }>): Promise<void> {
    this.logger.log(`Processing transcription for video ${job.data.videoId}`, {
      videoId: job.data.videoId,
      videoUrl: job.data.url,
    });

    try {
      const video = await this.videoRepository.findOneById(job.data.videoId);

      if (!video) {
        throw new Error(`Video with ID ${job.data.videoId} not found`);
      }

      await this.transcribeVideoUseCase.execute(video);
    } catch (error) {
      this.logger.error(
        `Error processing transcription for video ${job.data.videoId}`,
        {
          error,
          videoId: job.data.videoId,
          videoUrl: job.data.url,
        },
      );

      throw new Error(
        `Failed to process transcription for video ID: ${job.data.videoId}`,
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
