import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { Event } from '@catalogModule/persistence/entity/event.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindManyOptions } from 'typeorm';
import { EventType } from '@catalogModule/core/enum/event-type.enum';

@Injectable()
export class CatalogRepository extends DefaultTypeOrmRepository<Event> {
  constructor(
    @InjectDataSource('catalog')
    readonly datasource: DataSource,
  ) {
    super(Event, datasource.manager);
  }

  async findByType(
    {
      type,
    }: {
      type: EventType;
    },
    options?: Partial<FindManyOptions<Event>>,
  ) {
    return super.find({ where: { type }, ...options });
  }
}
