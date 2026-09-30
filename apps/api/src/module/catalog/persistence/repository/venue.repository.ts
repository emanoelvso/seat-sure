import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { DataSource } from 'typeorm';
import { Venue } from '../entity/venue.entity';

@Injectable()
export class VenueRepository extends DefaultTypeOrmRepository<Venue> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(Venue, datasource.manager);
  }
}
