import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { Event } from '@catalogModule/persistence/entity/event.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EventRepository extends DefaultTypeOrmRepository<Event> {
  constructor(
    @InjectDataSource()
    readonly datasource: DataSource,
  ) {
    super(Event, datasource.manager);
  }
}
