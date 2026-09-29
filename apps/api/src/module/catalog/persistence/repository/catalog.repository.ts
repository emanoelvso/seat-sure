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

  async findSimilarConcerts({
    artistId,
    genres,
    now,
    limit = 4,
  }: {
    artistId: string;
    genres: string[];
    now: Date;
    limit?: number;
  }) {
    const query = this.entityManager
      .createQueryBuilder(Event, 'event')
      .where('event.type = :type', { type: EventType.CONCERT })
      .andWhere('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.startAt >= :now', { now })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM "CatalogEventArtist" ea WHERE ea."eventId" = "event"."id" AND ea."artistId" = :artistId)',
        { artistId },
      );

    if (genres.length) {
      query
        .addSelect(
          'CASE WHEN LOWER("event"."category") IN (:...genres) THEN 0 ELSE 1 END',
          'genre_rank',
        )
        .orderBy('genre_rank', 'ASC')
        .setParameter('genres', genres);
    }

    return query.addOrderBy('event.startAt', 'ASC').limit(limit).getMany();
  }

  async findUpcomingPublishedById({
    id,
    now,
  }: {
    id: string;
    now: Date;
  }): Promise<Event | null> {
    return this.entityManager
      .createQueryBuilder(Event, 'event')
      .leftJoinAndSelect('event.seatMap', 'seatMap')
      .where('event.id = :id', { id })
      .andWhere('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.startAt >= :now', { now })
      .getOne();
  }

  async findNextFestival({ now }: { now: Date }) {
    return this.entityManager
      .createQueryBuilder(Event, 'event')
      .where('event.type = :type', { type: EventType.FESTIVAL })
      .andWhere('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.startAt >= :now', { now })
      .orderBy('event.startAt', 'ASC')
      .getOne();
  }
}
