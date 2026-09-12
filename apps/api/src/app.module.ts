import { CatalogModule } from '@catalogModule/catalog.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [CatalogModule],
})
export class AppModule {}
