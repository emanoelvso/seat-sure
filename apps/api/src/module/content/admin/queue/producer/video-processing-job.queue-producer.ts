import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { QUEUES } from '@contentModule/shared/queue/queue.constant';
import { Video } from '@contentModule/shared/persistence/entity/video.entity';

@Injectable()
export class VideoProcessingJobProducer {
  constructor(
    @InjectQueue(QUEUES.VIDEO_SUMMARY)
    private readonly videoSummaryQueue: Queue,
    @InjectQueue(QUEUES.VIDEO_TRANSCRIPT)
    private readonly videoTranscriptQueue: Queue,
    @InjectQueue(QUEUES.VIDEO_AGE_RECOMMENDATION)
    private readonly videoAgeReccomendationQueue: Queue,
    private readonly logger: AppLogger,
  ) {}

  private createVideoProcessingJob(video: Video) {
    return {
      videoId: video.id,
      url: video.url,
    };
  }

  async processRecommendation(video: Video) {
    this.logger.log(
      `Queueing video reccomendation processing job for video ID: ${video.id}`,
      { videoId: video.id },
    );

    const job = await this.videoAgeReccomendationQueue.add(
      'process',
      this.createVideoProcessingJob(video),
    );

    this.logger.log(
      `Video recommendation job created with ID: ${job.id} for video ID: ${video.id}`,
      { videoId: video.id, jobId: job.id },
    );

    return job.id;
  }
  async processTranscript(video: Video) {
    this.logger.log(
      `Queueing video transcript processing job for video ID: ${video.id}`,
      { videoId: video.id },
    );

    const job = await this.videoTranscriptQueue.add(
      'process',
      this.createVideoProcessingJob(video),
    );

    this.logger.log(
      `Video transcript job created with ID: ${job.id} for video ID: ${video.id}`,
      { videoId: video.id, jobId: job.id },
    );

    return job.id;
  }
  async processSummary(video: Video) {
    this.logger.log(
      `Queueing video summary processing job for video ID: ${video.id}`,
      { videoId: video.id },
    );

    const job = await this.videoSummaryQueue.add(
      'process',
      this.createVideoProcessingJob(video),
    );

    this.logger.log(
      `Video summary job created with ID: ${job.id} for video ID: ${video.id}`,
      { videoId: video.id, jobId: job.id },
    );

    return job.id;
  }
}
