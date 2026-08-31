import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { GetStreamingURLUseCase } from '@contentModule/catalog/core/use-case/get-streaming-url.use-case';
import { AuthGuard } from '@sharedModules/auth/guard/auth.guard';
import { VideoNotFoundException } from '@contentModule/shared/core/exception/video-not-found.exception';

@Controller('stream')
export class MediaPlayerController {
  constructor(
    private readonly getStreamingUrlUseCase: GetStreamingURLUseCase,
  ) {}

  @UseGuards(AuthGuard)
  @Get('/:videoId')
  @Header('Content-Type', 'video/mp4')
  async streamVideo(
    @Param('videoId') videoId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const url = await this.getStreamingUrlUseCase.execute(videoId);

      const videoPath = path.join('.', url);
      const fileSize = statSync(videoPath).size;

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = createReadStream(videoPath, { start, end });

        res.writeHead(HttpStatus.PARTIAL_CONTENT, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
        });

        file.pipe(res);
      } else {
        res.writeHead(HttpStatus.OK, {
          'content-length': fileSize,
          'content-type': 'video/mp4',
        });

        createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      if (error instanceof VideoNotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).send({
          message: error.message,
          error: 'Not Found',
          statuscode: HttpStatus.NOT_FOUND,
        });
      }

      throw error;
    }
  }
}
