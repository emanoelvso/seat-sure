import { Injectable } from '@nestjs/common';
import { DefaultTypeOrmRepository } from '@sharedModules/persistence/typeorm/repository/default-typeorm.repository';
import { Event } from '@catalogModule/persistence/entity/event.entity';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindManyOptions } from 'typeorm';
import { EventType } from '@catalogModule/core/enum/event-type.enum';
import { EventStatus } from '@catalogModule/core/enum/event-status.enum';

@Injectable()
export class EventRepository extends DefaultTypeOrmRepository<Event> {
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

  async findUpcomingByArtist({
    artistId,
    now,
    limit = 100,
  }: {
    artistId: string;
    now: Date;
    limit?: number;
  }) {
    return this.entityManager
      .createQueryBuilder(Event, 'event')
      .innerJoin('event.eventArtists', 'ea')
      .where('ea.artistId = :artistId', { artistId })
      .andWhere('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.startAt >= :now', { now })
      .orderBy('event.startAt', 'ASC')
      .limit(limit)
      .getMany();
  }
}
