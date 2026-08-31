import { Injectable } from '@nestjs/common';
import { VideoProcessingJobProducer } from '@contentModule/admin/queue/producer/video-processing-job.queue-producer';
import { Video } from '@contentModule/shared/persistence/entity/video.entity';

@Injectable()
export class VideoProcessorService {
  constructor(
    private readonly videoProcessorJobProducer: VideoProcessingJobProducer,
  ) {}

  async processMetadataAndModeration(video: Video) {
    await Promise.all([
      this.videoProcessorJobProducer.processRecommendation(video),
      this.videoProcessorJobProducer.processTranscript(video),
      this.videoProcessorJobProducer.processSummary(video),
    ]);
  }
}
