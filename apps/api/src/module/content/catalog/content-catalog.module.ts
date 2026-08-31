import { Module } from "@nestjs/common";
import { GetStreamingURLUseCase } from "./core/use-case/get-streaming-url.use-case";
import { MediaPlayerController } from "./http/rest/controller/media-player.controller";
import { ContentSharedModule } from "@contentModule/shared/content-shared.module";
import { AuthModule } from "@sharedModules/auth/auth.module";
import { LoggerModule } from "@sharedModules/logger/logger.module";

@Module({
    imports: [ContentSharedModule, AuthModule, LoggerModule],
    providers: [GetStreamingURLUseCase],
    controllers: [MediaPlayerController],
})
export class ContentCatalogModule {}