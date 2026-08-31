import { Inject, Injectable } from '@nestjs/common';
import { VideoTranscriptGenerationAdapter } from '../adapter/video-transcript-generator.adapter.interface';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { VideoMetadataRepository } from '@contentModule/video-processor/persistence/repository/video-metadata.repository';
import { Video } from '@contentModule/shared/persistence/entity/video.entity';
import { VideoMetadata } from '@contentModule/shared/persistence/entity/video-metadata.entity';

@Injectable()
export class TranscribeVideoUseCase {
  constructor(
    @Inject(VideoTranscriptGenerationAdapter)
    private readonly videoTranscriptGenerationAdapter: VideoTranscriptGenerationAdapter,
    private readonly videoMetadataRepository: VideoMetadataRepository,
    private readonly logger: AppLogger,
  ) {}
  async execute(video: Video): Promise<void> {
    const transcript =
      await this.videoTranscriptGenerationAdapter.generateTranscript(video.url);

    if (!transcript) {
      throw new Error(
        `Failed to generate transcript for video with ID: ${video.id}`,
      );
    }
    this.logger.log(`Generated transcript for video ID: ${video.id}`, {
      transcript,
      videoId: video.id,
    });

    const metadata = await this.videoMetadataRepository.findOne({
      where: { video },
    });

    if (metadata) {
      metadata.transcript = transcript;
      await this.videoMetadataRepository.save(metadata);
      return;
    }

    const newMetadata = new VideoMetadata({
      transcript,
      video,
    });

    await this.videoMetadataRepository.save(newMetadata);
  }
}
