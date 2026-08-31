import { Injectable } from '@nestjs/common';
import { TvShowContentModel } from '../model/tv-show-content.model';
import { MovieContentModel } from '../model/movie-content.model';

@Injectable()
export class ContentAgeRecommendationService {
  async setAgeRecommendationForContent(
    content: TvShowContentModel | MovieContentModel,
    lastAgeRecommendation: number,
  ): Promise<void> {
    if (!content.ageRecommendation && lastAgeRecommendation) {
      content.ageRecommendation = lastAgeRecommendation;
    }

    if (
      content.ageRecommendation &&
      lastAgeRecommendation &&
      lastAgeRecommendation > content.ageRecommendation
    ) {
      content.ageRecommendation = lastAgeRecommendation;
    }
  }
}
