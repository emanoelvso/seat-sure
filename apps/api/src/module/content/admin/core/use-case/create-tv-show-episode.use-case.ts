import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEpisodeRequestDto } from '@contentModule/admin/http/rest/dto/request/create-episode-request.dto';
import { runInTransaction } from 'typeorm-transactional';
import { AppLogger } from '@sharedModules/logger/service/app-logger.service';
import { ContentRepository } from '@contentModule/admin/persistence/repository/content.repository';
import { EpisodeLifecycleService } from '../service/episode-lifecycle.service';
import { VideoProcessorService } from '../service/video-processor.service';
import { ContentDistributionService } from '../service/content-distribution.service';
import { Episode } from '@contentModule/shared/persistence/entity/episode.entity';
import { Video } from '@contentModule/shared/persistence/entity/video.entity';
import { EpisodeRepository } from '@contentModule/admin/persistence/repository/episode.repository';
import { TvShow } from '@contentModule/shared/persistence/entity/tv-show.entity';

@Injectable()
export class CreateTvShowEpisodeUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly episodeLifecycleService: EpisodeLifecycleService,
    private readonly videoProcessorService: VideoProcessorService,
    private readonly episodeRepository: EpisodeRepository,
    private readonly contentDistributionService: ContentDistributionService,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    episodeData: CreateEpisodeRequestDto & {
      videoUrl: string;
      contentId: string;
      videoSizeInKb: number;
    },
  ): Promise<Episode> {
    const content = await this.contentRepository.findTvShowContentById(
      episodeData.contentId,
      { tvShow: true },
    );

    if (!content?.tvShow) {
      throw new NotFoundException(
        `TV Show with id ${episodeData.contentId} not found`,
      );
    }

    const episode = new Episode({
      title: episodeData.title,
      description: episodeData.description,
      season: episodeData.season,
      number: episodeData.number,
      tvShow: content.tvShow,
    });

    await this.episodeLifecycleService.checkEpisodeConstraintOrThrow(episode);

    // TODO: add status to the video
    const video = new Video({
      url: episodeData.videoUrl,
      sizeInKb: episodeData.videoSizeInKb,
    });

    episode.video = video;

    await runInTransaction(
      async () => {
        await this.contentRepository.saveTvShow(content);

        const savedEpisode = await this.episodeRepository.save(episode);

        this.logger.log(
          `Episode ${savedEpisode.title} with id ${savedEpisode.id} created`,
          { content, savedEpisode },
        );
        return savedEpisode;
      },
      { connectionName: 'content' },
    );

    await this.videoProcessorService.processMetadataAndModeration(video);
    await this.contentDistributionService.distributeContent(content.id);

    return episode;
  }
}
