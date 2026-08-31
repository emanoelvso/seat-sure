import { Module } from '@nestjs/common';
import { ContentAdminModule } from './admin/content-admin.module';
import { ContentCatalogModule } from './catalog/content-catalog.module';

@Module({
  imports: [ContentAdminModule, ContentCatalogModule],
})
export class ContentModule {}
