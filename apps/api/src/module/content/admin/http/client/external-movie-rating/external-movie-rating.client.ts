import { Injectable } from '@nestjs/common';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { HttpClient } from '@sharedModules/http-client/client/http.client';

interface ApiResponse<T extends Record<string, any>> {
  results: Array<T>;
}

@Injectable()
export class ExternalMovieClient {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClient,
  ) {}

  async getRating(title: string): Promise<number | undefined> {
    const keyword = await this.stringToKeywordId(title);

    if (!keyword) {
      return undefined;
    }

    const apiResponse = await this.fetch<{ vote_avarage: number }>(
      `discover/movie?with_keywords=${keyword}`,
    );

    return apiResponse.results.length > 0
      ? apiResponse.results[0].vote_avarage
      : undefined;
  }

  private async stringToKeywordId(title: string): Promise<string | undefined> {
    const apiResponse = await this.fetch<{ id: string }>(
      `/search/keyword?query=${encodeURI(title)}&page=1`,
    );

    return apiResponse.results.length > 0
      ? apiResponse.results[0].id
      : undefined;
  }

  private async fetch<T extends Record<string, any>>(
    path: string,
  ): Promise<ApiResponse<T>> {
    const movieDbApiToken = this.configService.get('movieDb').apiKey;
    const movieDbApiUrl = this.configService.get('movieDb').url;
    const url = `${movieDbApiUrl}${path}`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${movieDbApiToken}`,
      },
    };

    return this.httpClient.get<ApiResponse<T>>(url, options);
  }
}
