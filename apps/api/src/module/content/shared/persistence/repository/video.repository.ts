import { DataSource } from 'typeorm';
import { Video } from '../entity/video.entity';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { InjectDataSource } from '@nestjs/typeorm';

export class VideoRepository extends DefaultTypeOrmRepository<Video> {
  constructor(@InjectDataSource('content') readonly dataSource: DataSource) {
    super(Video, dataSource.manager);
  }
}
